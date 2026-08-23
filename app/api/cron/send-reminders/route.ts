import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend, REMINDERS_FROM_EMAIL } from "@/lib/resend";
import { addDaysUtc, toneForOffset } from "@/lib/reminders";
import { formatDate, formatMoney } from "@/lib/format";
import { checkCronRateLimit } from "@/lib/rate-limit";
import ReminderBeforeDueEmail from "@/emails/reminder-before-due";
import ReminderOverdueEmail from "@/emails/reminder-overdue";
import ReminderSeriouslyOverdueEmail from "@/emails/reminder-seriously-overdue";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { success } = await checkCronRateLimit("send-reminders");
  if (!success) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

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
    return NextResponse.json({ error: "Failed to load clients" }, { status: 500 });
  }
  const customerById = new Map((customers ?? []).map((c) => [c.id, c]));

  const { data: existingLogs, error: logsError } = await supabase
    .from("reminder_logs")
    .select("invoice_id, offset_days")
    .in(
      "invoice_id",
      invoices.map((i) => i.id)
    );

  if (logsError) {
    console.error("cron/send-reminders: failed to load reminder logs", logsError);
    return NextResponse.json({ error: "Failed to load reminder logs" }, { status: 500 });
  }
  const alreadySent = new Set((existingLogs ?? []).map((l) => `${l.invoice_id}:${l.offset_days}`));

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
    // hasn't been logged yet. Only the most recent one actually gets sent;
    // this stops a backdated invoice from firing every past milestone in
    // one email storm on the first run after it's created.
    const due = offsets
      .filter((offsetDays) => !alreadySent.has(`${invoice.id}:${offsetDays}`))
      .map((offsetDays) => ({ offsetDays, targetDate: addDaysUtc(invoice.due_date, offsetDays) }))
      .filter(({ targetDate }) => targetDate.getTime() <= todayUtcMidnight)
      .sort((a, b) => b.targetDate.getTime() - a.targetDate.getTime());

    checked += due.length;
    if (due.length === 0) continue;

    const [{ offsetDays }, ...stale] = due;

    for (const { offsetDays: staleOffset } of stale) {
      await supabase.from("reminder_logs").insert({
        invoice_id: invoice.id,
        user_id: invoice.user_id,
        offset_days: staleOffset,
        status: "skipped",
      });
      skipped++;
    }

    const tone = toneForOffset(offsetDays);
    const businessName = profile.business_name || profile.email;
    const amountLabel = formatMoney(Number(invoice.amount), invoice.currency);
    const dueDateFormatted = formatDate(invoice.due_date);
    const paymentLink = customer.payment_link ?? profile.payment_link ?? undefined;

    const element =
      tone === "seriously_overdue"
        ? ReminderSeriouslyOverdueEmail({
            businessName,
            clientName: customer.name,
            invoiceNumber: invoice.invoice_number ?? undefined,
            amount: amountLabel,
            dueDateLabel: `Was due ${dueDateFormatted}`,
            daysOverdue: offsetDays,
            paymentLink,
          })
        : tone === "overdue"
          ? ReminderOverdueEmail({
              businessName,
              clientName: customer.name,
              invoiceNumber: invoice.invoice_number ?? undefined,
              amount: amountLabel,
              dueDateLabel: `Was due ${dueDateFormatted}`,
              daysOverdue: offsetDays,
              paymentLink,
            })
          : ReminderBeforeDueEmail({
              businessName,
              clientName: customer.name,
              invoiceNumber: invoice.invoice_number ?? undefined,
              amount: amountLabel,
              dueDateLabel: `Due ${dueDateFormatted}`,
              daysUntilDue: -offsetDays,
              paymentLink,
            });

    const subject =
      tone === "seriously_overdue"
        ? `Please arrange payment: invoice ${invoice.invoice_number ?? ""} from ${businessName}`.trim()
        : tone === "overdue"
          ? `Overdue: invoice ${invoice.invoice_number ?? ""} from ${businessName}`.trim()
          : `Reminder: invoice ${invoice.invoice_number ?? ""} due soon from ${businessName}`.trim();

    try {
      const { data, error } = await resend.emails.send({
        from: REMINDERS_FROM_EMAIL,
        to: customer.email,
        replyTo: profile.email,
        subject,
        react: element,
      });

      if (error) throw new Error(error.message);

      await supabase.from("reminder_logs").insert({
        invoice_id: invoice.id,
        user_id: invoice.user_id,
        offset_days: offsetDays,
        status: "sent",
        resend_message_id: data?.id ?? null,
      });
      sent++;
    } catch (err) {
      console.error("cron/send-reminders: send failed", { invoiceId: invoice.id, err });
      await supabase.from("reminder_logs").insert({
        invoice_id: invoice.id,
        user_id: invoice.user_id,
        offset_days: offsetDays,
        status: "failed",
        error: err instanceof Error ? err.message : "Unknown error",
      });
      failed++;
    }
  }

  return NextResponse.json({ checked, sent, skipped, failed });
}
