import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend, REMINDERS_FROM_EMAIL } from "@/lib/resend";
import { addDaysUtc, isTodayUtc, toneForOffset } from "@/lib/reminders";
import { formatDate, formatMoney } from "@/lib/format";
import { checkCronRateLimit } from "@/lib/rate-limit";
import ReminderBeforeDueEmail from "@/emails/reminder-before-due";
import ReminderOverdueEmail from "@/emails/reminder-overdue";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
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
  const [{ data: profiles, error: profilesError }, { data: settings, error: settingsError }] =
    await Promise.all([
      supabase.from("profiles").select("id, business_name, email"),
      supabase.from("reminder_settings").select("user_id, offsets, enabled").eq("enabled", true),
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
  const offsetsByUser = new Map((settings ?? []).map((s) => [s.user_id, s.offsets]));

  if (allUserIds.length === 0) {
    return NextResponse.json({ checked: 0, sent: 0, failed: 0 });
  }

  const { data: invoices, error: invoicesError } = await supabase
    .from("invoices")
    .select("id, user_id, customer_id, invoice_number, amount, currency, due_date")
    .eq("status", "unpaid")
    .in("user_id", allUserIds);

  if (invoicesError) {
    console.error("cron/send-reminders: failed to load invoices", invoicesError);
    return NextResponse.json({ error: "Failed to load invoices" }, { status: 500 });
  }

  if (!invoices || invoices.length === 0) {
    return NextResponse.json({ checked: 0, sent: 0, failed: 0 });
  }

  const customerIds = [...new Set(invoices.map((i) => i.customer_id))];
  const { data: customers, error: customersError } = await supabase
    .from("customers")
    .select("id, name, email")
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

  for (const invoice of invoices) {
    const offsets = offsetsByUser.get(invoice.user_id);
    const profile = profileById.get(invoice.user_id);
    const customer = customerById.get(invoice.customer_id);
    if (!offsets || !profile || !customer) continue;

    for (const offsetDays of offsets) {
      checked++;
      const key = `${invoice.id}:${offsetDays}`;
      if (alreadySent.has(key)) continue;

      const targetDate = addDaysUtc(invoice.due_date, offsetDays);
      if (!isTodayUtc(targetDate)) continue;

      const tone = toneForOffset(offsetDays);
      const businessName = profile.business_name || profile.email;
      const amountLabel = formatMoney(Number(invoice.amount), invoice.currency);
      const dueDateFormatted = formatDate(invoice.due_date);

      const element =
        tone === "overdue"
          ? ReminderOverdueEmail({
              businessName,
              clientName: customer.name,
              invoiceNumber: invoice.invoice_number ?? undefined,
              amount: amountLabel,
              dueDateLabel: `Was due ${dueDateFormatted}`,
              daysOverdue: offsetDays,
            })
          : ReminderBeforeDueEmail({
              businessName,
              clientName: customer.name,
              invoiceNumber: invoice.invoice_number ?? undefined,
              amount: amountLabel,
              dueDateLabel: `Due ${dueDateFormatted}`,
              daysUntilDue: -offsetDays,
            });

      const subject =
        tone === "overdue"
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
  }

  return NextResponse.json({ checked, sent, failed });
}
