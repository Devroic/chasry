import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend, REMINDERS_FROM_EMAIL } from "@/lib/resend";
import { addDaysUtc } from "@/lib/reminders";
import { buildReminderEmail } from "@/lib/reminder-email";
import { buildEmailAttachment } from "@/lib/invoice-attachment";
import { checkCronRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** How long a *failed* send keeps retrying before giving up on a likely-undeliverable address. */
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

  // Monitors for a missing run (scheduler silently stopping), not just a thrown error.
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
      // Sweep signals failure via 500, not a throw, so status is derived from the response.
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

  // Reminders send for every account regardless of plan — plan only limits active invoice count.
  const [{ data: profiles, error: profilesError }, { data: settings, error: settingsError }] =
    await Promise.all([
      supabase.from("profiles").select("id, business_name, email, payment_link, reminder_locale"),
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
      "id, user_id, customer_id, invoice_number, amount, currency, due_date, reminder_offsets, reminder_enabled, attachment_filename, attachment_content_type, attachment_data"
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
    .select("id, name, email, payment_link, reminder_offsets, reminder_enabled, reminder_locale")
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

  // Only 'sent' and 'skipped' are terminal — 'failed' retries on the next run
  // instead of being silently lost forever.
  const settled = new Set<string>();
  const failedBefore = new Set<string>();
  for (const log of existingLogs ?? []) {
    const key = `${log.invoice_id}:${log.offset_days}`;
    if (log.status === "failed") failedBefore.add(key);
    else settled.add(key);
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

    // Cascade: invoice override → client override → account default.
    const enabled = invoice.reminder_enabled ?? customer.reminder_enabled ?? defaultSettings.enabled;
    if (!enabled) continue;
    const offsets = invoice.reminder_offsets ?? customer.reminder_offsets ?? defaultSettings.offsets;

    const businessName = profile.business_name || profile.email;
    const paymentLink = customer.payment_link ?? profile.payment_link ?? undefined;
    const locale = customer.reminder_locale ?? profile.reminder_locale;

    // Each offset gets exactly one chance, its target day. Missed that day
    // for any reason → marked skipped, never sent late.
    for (const offsetDays of offsets) {
      const key = `${invoice.id}:${offsetDays}`;
      if (settled.has(key)) continue;

      const targetMs = addDaysUtc(invoice.due_date, offsetDays).getTime();
      const isRetry = failedBefore.has(key);

      if (isRetry) {
        // Retries, but only within a bounded window — otherwise a permanently
        // undeliverable address would retry forever.
        if (todayUtcMidnight - targetMs > FAILED_RETRY_WINDOW_MS) continue;
      } else if (targetMs < todayUtcMidnight) {
        await supabase.from("reminder_logs").upsert(
          { invoice_id: invoice.id, user_id: invoice.user_id, offset_days: offsetDays, status: "skipped" },
          { onConflict: "invoice_id,offset_days" }
        );
        skipped++;
        checked++;
        continue;
      } else if (targetMs > todayUtcMidnight) {
        continue; // still ahead, nothing to do yet
      }

      checked++;
      const { element, subject } = buildReminderEmail({
        offsetDays,
        businessName,
        clientName: customer.name,
        invoiceNumber: invoice.invoice_number,
        amount: Number(invoice.amount),
        currency: invoice.currency,
        dueDate: invoice.due_date,
        paymentLink,
        locale,
      });

      try {
        const { data, error } = await resend.emails.send({
          from: REMINDERS_FROM_EMAIL,
          to: customer.email,
          replyTo: profile.email,
          subject,
          react: element,
          attachments: buildEmailAttachment(invoice),
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
        // Tagged, not just logged — a burst of these signals Resend's daily cap was hit.
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
