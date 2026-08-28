import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend, REMINDERS_FROM_EMAIL } from "@/lib/resend";
import { addDaysUtc } from "@/lib/reminders";
import { buildReminderEmail } from "@/lib/reminder-email";
import { checkCronRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** How long after an offset's target date a *failed* send keeps retrying.
 * Long enough to ride out a transient outage or a one-day Resend quota
 * exhaustion, short enough that a permanently-undeliverable address stops
 * being retried instead of bouncing daily forever. */
const FAILED_RETRY_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;

  // Constant-time comparison — a plain `===` leaks timing information an
  // attacker could use to guess the secret byte-by-byte over many requests.
  const headerBuf = Buffer.from(header);
  const expectedBuf = Buffer.from(expected);
  if (headerBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(headerBuf, expectedBuf);
}

/** Sentry Cron Monitor slug. Must match the monitor in the Sentry UI — it's
 * auto-created from the config below on the first check-in. */
const MONITOR_SLUG = "send-reminders";

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { success } = await checkCronRateLimit("send-reminders");
  if (!success) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  // Check-in starts *after* auth/rate-limit so a rejected probe isn't recorded
  // as a job run (or a job failure). From here on, this is a genuine execution.
  //
  // Why this exists at all: captureException only fires when something
  // *throws*. If Vercel's scheduler stops firing this route entirely — the
  // single worst failure mode for the product, since reminders are the whole
  // point — nothing throws, so nothing is reported and the app looks healthy
  // while quietly doing nothing. A check-in monitor inverts that: Sentry
  // alerts on the *absence* of an expected run.
  const checkInId = Sentry.captureCheckIn(
    { monitorSlug: MONITOR_SLUG, status: "in_progress" },
    {
      // Mirrors vercel.json's "0 7 * * *".
      schedule: { type: "crontab", value: "0 7 * * *" },
      // Grace period before a missed run is flagged — absorbs a late start
      // without crying wolf.
      checkinMargin: 60,
      // maxDuration route config is 60s; alert if a run overruns well past it.
      maxRuntime: 5,
      timezone: "UTC",
    }
  );

  try {
    const response = await runReminderSweep();
    Sentry.captureCheckIn({
      checkInId,
      monitorSlug: MONITOR_SLUG,
      // The sweep signals failure by returning 500, not by throwing, so the
      // check-in status has to be derived from the response — otherwise a
      // failed run would be recorded as a healthy one.
      status: response.ok ? "ok" : "error",
    });
    return response;
  } catch (err) {
    Sentry.captureCheckIn({ checkInId, monitorSlug: MONITOR_SLUG, status: "error" });
    Sentry.captureException(err, { tags: { job: "send-reminders", stage: "unhandled" } });
    console.error("cron/send-reminders: unhandled failure", err);
    return NextResponse.json({ error: "Reminder run failed" }, { status: 500 });
  }
}

async function runReminderSweep() {
  const supabase = createAdminClient();

  // Reminders send for every account regardless of plan — free-plan invoices
  // get chased too, that's the point of letting people try Chasry for free.
  // Plan only limits how many active invoices someone can have at once (see
  // lib/plan.ts), not whether reminders work on the ones they do have.
  //
  // `reminder_settings` is fetched for every user, not just ones with
  // `enabled = true` (unlike before per-client/per-invoice overrides
  // existed) — a user could have the account-wide default off but a
  // specific client or invoice overridden back on, so the account-level
  // row is just one input to the per-invoice resolution below, not a
  // pre-filter.
  const [{ data: profiles, error: profilesError }, { data: settings, error: settingsError }] =
    await Promise.all([
      supabase.from("profiles").select("id, business_name, email, payment_link"),
      supabase.from("reminder_settings").select("user_id, offsets, enabled"),
    ]);

  if (profilesError || settingsError) {
    console.error("cron/send-reminders: failed to load profiles/settings", {
      profilesError,
      settingsError,
    });
    Sentry.captureException(profilesError ?? settingsError, {
      tags: { job: "send-reminders", stage: "load-profiles" },
    });
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }

  const allUserIds = (profiles ?? []).map((p) => p.id);
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const defaultSettingsByUser = new Map((settings ?? []).map((s) => [s.user_id, s]));

  if (allUserIds.length === 0) {
    return NextResponse.json({ checked: 0, sent: 0, skipped: 0, failed: 0 });
  }

  const { data: invoices, error: invoicesError } = await supabase
    .from("invoices")
    .select(
      "id, user_id, customer_id, invoice_number, amount, currency, due_date, reminder_offsets, reminder_enabled"
    )
    .eq("status", "unpaid")
    .in("user_id", allUserIds);

  if (invoicesError) {
    console.error("cron/send-reminders: failed to load invoices", invoicesError);
    Sentry.captureException(invoicesError, {
      tags: { job: "send-reminders", stage: "load-invoices" },
    });
    return NextResponse.json({ error: "Failed to load invoices" }, { status: 500 });
  }

  if (!invoices || invoices.length === 0) {
    return NextResponse.json({ checked: 0, sent: 0, skipped: 0, failed: 0 });
  }

  const customerIds = [...new Set(invoices.map((i) => i.customer_id))];
  const { data: customers, error: customersError } = await supabase
    .from("customers")
    .select("id, name, email, payment_link, reminder_offsets, reminder_enabled")
    .in("id", customerIds);

  if (customersError) {
    console.error("cron/send-reminders: failed to load customers", customersError);
    Sentry.captureException(customersError, {
      tags: { job: "send-reminders", stage: "load-customers" },
    });
    return NextResponse.json({ error: "Failed to load clients" }, { status: 500 });
  }
  const customerById = new Map((customers ?? []).map((c) => [c.id, c]));

  const { data: existingLogs, error: logsError } = await supabase
    .from("reminder_logs")
    .select("invoice_id, offset_days, status")
    .in(
      "invoice_id",
      invoices.map((i) => i.id)
    );

  if (logsError) {
    console.error("cron/send-reminders: failed to load reminder logs", logsError);
    Sentry.captureException(logsError, {
      tags: { job: "send-reminders", stage: "load-logs" },
    });
    return NextResponse.json({ error: "Failed to load reminder logs" }, { status: 500 });
  }

  // `status` matters here — this used to key off *every* log row regardless of
  // status, which meant a reminder that failed to send was recorded as
  // 'failed' and then skipped forever: it never retried, and the user was
  // never told. A single transient blip (or hitting Resend's free-tier
  // 100-emails/day cap, which the whole account shares with Supabase Auth's
  // signup/reset mail) silently lost that reminder permanently — the exact
  // opposite of the product's promise. Only 'sent' and 'skipped' are terminal
  // now; 'failed' is retried on the next run.
  const settled = new Set<string>();
  const failedBefore = new Set<string>();
  // Any log at all for an invoice, of any status/offset — distinguishes an
  // invoice's very first reminder check from a later one (see `isFirstCheck`
  // below).
  const invoiceHasHistory = new Set<string>();
  for (const log of existingLogs ?? []) {
    const key = `${log.invoice_id}:${log.offset_days}`;
    if (log.status === "failed") failedBefore.add(key);
    else settled.add(key);
    invoiceHasHistory.add(log.invoice_id);
  }

  let sent = 0;
  let failed = 0;
  let checked = 0;
  let skipped = 0;

  const today = new Date();
  const todayUtcMidnight = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());

  for (const invoice of invoices) {
    const defaultSettings = defaultSettingsByUser.get(invoice.user_id);
    const profile = profileById.get(invoice.user_id);
    const customer = customerById.get(invoice.customer_id);
    if (!defaultSettings || !profile || !customer) continue;

    // Cascade: invoice override → client override → account default. Both
    // `reminder_offsets`/`reminder_enabled` are always written together by
    // the app (see lib/reminder-override.ts), so checking one for `null`
    // is enough to tell "no override at this level" from "override, but
    // it's an empty schedule."
    const enabled = invoice.reminder_enabled ?? customer.reminder_enabled ?? defaultSettings.enabled;
    if (!enabled) continue;
    const offsets = invoice.reminder_offsets ?? customer.reminder_offsets ?? defaultSettings.offsets;

    // Every offset whose target date has arrived (today or earlier — earlier
    // covers an invoice logged already overdue, or a missed cron run) and
    // hasn't been logged yet.
    const due = offsets
      .filter((offsetDays) => !settled.has(`${invoice.id}:${offsetDays}`))
      .map((offsetDays) => ({ offsetDays, targetDate: addDaysUtc(invoice.due_date, offsetDays) }))
      .filter(({ targetDate }) => targetDate.getTime() <= todayUtcMidnight)
      // A previously-failed offset retries, but only for a bounded window.
      // Without this, the *last* offset in a schedule (nothing newer ever
      // supersedes it) would retry every single day forever against an
      // address that may simply be undeliverable — burning quota and
      // hard-bouncing daily, which damages domain sending reputation.
      .filter(({ offsetDays, targetDate }) =>
        failedBefore.has(`${invoice.id}:${offsetDays}`)
          ? todayUtcMidnight - targetDate.getTime() <= FAILED_RETRY_WINDOW_MS
          : true
      )
      .sort((a, b) => b.targetDate.getTime() - a.targetDate.getTime());

    checked += due.length;
    if (due.length === 0) continue;

    // Multiple simultaneously-due offsets need different handling depending
    // on whether this invoice has ever been checked before. On the very
    // first check, it usually means the invoice was logged already overdue
    // (backdated, or a bulk import) — sending every past milestone at once
    // would be an email storm, so only the most current offset goes out and
    // the rest are marked skipped. Once an invoice already has *some*
    // history, though, >1 due offset only happens because a run was missed
    // (e.g. an invoice created after that day's single daily cron already
    // ran) — every one of those is a reminder the user actually configured,
    // and none should be silently dropped just because a newer offset also
    // became due before the gap was caught up. Sent oldest first so a
    // multi-day catch-up still arrives in the order it was meant to.
    const isFirstCheck = !invoiceHasHistory.has(invoice.id);
    const toSend = isFirstCheck
      ? due.slice(0, 1)
      : due.slice().sort((a, b) => a.targetDate.getTime() - b.targetDate.getTime());
    const toSkip = isFirstCheck ? due.slice(1) : [];

    // Upsert, not insert: a row may already exist for this offset from an
    // earlier failed attempt, and `unique (invoice_id, offset_days)` would
    // reject a plain insert — which, before failures were retried at all,
    // could never happen. Same reason applies to the sent/failed writes below.
    for (const { offsetDays: staleOffset } of toSkip) {
      await supabase.from("reminder_logs").upsert(
        {
          invoice_id: invoice.id,
          user_id: invoice.user_id,
          offset_days: staleOffset,
          status: "skipped",
        },
        { onConflict: "invoice_id,offset_days" }
      );
      skipped++;
    }

    const businessName = profile.business_name || profile.email;
    const paymentLink = customer.payment_link ?? profile.payment_link ?? undefined;

    for (const { offsetDays } of toSend) {
      const { element, subject } = buildReminderEmail({
        offsetDays,
        businessName,
        clientName: customer.name,
        invoiceNumber: invoice.invoice_number,
        amount: Number(invoice.amount),
        currency: invoice.currency,
        dueDate: invoice.due_date,
        paymentLink,
      });

      try {
        const { data, error } = await resend.emails.send({
          from: REMINDERS_FROM_EMAIL,
          to: customer.email,
          replyTo: profile.email,
          subject,
          react: element,
        });

        if (error) throw new Error(error.message);

        await supabase.from("reminder_logs").upsert(
          {
            invoice_id: invoice.id,
            user_id: invoice.user_id,
            offset_days: offsetDays,
            status: "sent",
            resend_message_id: data?.id ?? null,
            error: null,
          },
          { onConflict: "invoice_id,offset_days" }
        );
        sent++;
      } catch (err) {
        console.error("cron/send-reminders: send failed", { invoiceId: invoice.id, err });
        // Per-invoice send failure. Tagged (not just logged) because a burst of
        // these is the signal that Resend's daily cap was hit — the failure mode
        // that used to lose reminders permanently. No client email or invoice
        // amount is attached; the invoice id is enough to investigate.
        Sentry.captureException(err, {
          tags: { job: "send-reminders", stage: "send" },
          extra: { invoiceId: invoice.id, offsetDays },
        });
        await supabase.from("reminder_logs").upsert(
          {
            invoice_id: invoice.id,
            user_id: invoice.user_id,
            offset_days: offsetDays,
            status: "failed",
            error: err instanceof Error ? err.message : "Unknown error",
          },
          { onConflict: "invoice_id,offset_days" }
        );
        failed++;
      }
    }
  }

  return NextResponse.json({ checked, sent, skipped, failed });
}
