import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { handleCronRequest } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend, ACCOUNT_FROM_EMAIL } from "@/lib/resend";
import { formatMoney, daysUntil } from "@/lib/format";
import { isAdminEmail } from "@/lib/auth";
import { getAppUrl } from "@/lib/constants";
import { linkTokensEnabled, signInvoiceLink } from "@/lib/link-token";
import WeeklyDigestEmail, { type WeeklyDigestOverdueLine } from "@/emails/weekly-digest";
import { logEmailSend } from "@/lib/email-log";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Most-overdue invoices listed per digest; the dashboard has the rest. */
const MAX_OVERDUE_LINES = 5;

/** Idempotency window — a retried Monday run must not double-send. */
const RESEND_GUARD_MS = 6 * 24 * 60 * 60 * 1000;

/** How long a digest's one-click "mark as paid" link stays valid. */
const MARK_PAID_LINK_EXPIRY_DAYS = 14;

export async function GET(request: Request) {
  return handleCronRequest(request, {
    monitorSlug: "weekly-digest",
    // Mirrors vercel.json's schedule for this route (Monday morning UTC).
    schedule: "0 8 * * 1",
    run: runDigestSweep,
  });
}

async function runDigestSweep() {
  const supabase = createAdminClient();
  const appUrl = getAppUrl();
  const nowMs = Date.now();
  const weekAgoIso = new Date(nowMs - 7 * 86_400_000).toISOString();

  const [{ data: profiles, error: profilesError }, { data: invoices, error: invoicesError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, email, digest_enabled, digest_sent_at, onboarded_at")
        .eq("digest_enabled", true)
        .is("suspended_at", null),
      supabase
        .from("invoices")
        .select("id, user_id, invoice_number, amount, currency, due_date, customer_id")
        .eq("status", "unpaid"),
    ]);

  if (profilesError || invoicesError) {
    Sentry.captureException(profilesError ?? invoicesError, {
      tags: { job: "weekly-digest", stage: "load" },
    });
    return NextResponse.json({ error: "Failed to load data" }, { status: 500 });
  }

  const invoicesByUser = new Map<string, NonNullable<typeof invoices>>();
  for (const invoice of invoices ?? []) {
    invoicesByUser.set(invoice.user_id, [...(invoicesByUser.get(invoice.user_id) ?? []), invoice]);
  }

  // One aggregate query for last week's activity instead of one per user.
  const { data: recentLogs } = await supabase
    .from("reminder_logs")
    .select("user_id")
    .eq("status", "sent")
    .gte("sent_at", weekAgoIso);
  const sentCountByUser = new Map<string, number>();
  for (const log of recentLogs ?? []) {
    sentCountByUser.set(log.user_id, (sentCountByUser.get(log.user_id) ?? 0) + 1);
  }

  const customerIds = [...new Set((invoices ?? []).map((i) => i.customer_id))];
  const { data: customers } = customerIds.length
    ? await supabase.from("customers").select("id, name").in("id", customerIds)
    : { data: [] };
  const customerName = new Map((customers ?? []).map((c) => [c.id, c.name]));

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const profile of profiles ?? []) {
    // Admin accounts see everything in /admin; their own digest would be noise.
    if (!profile.onboarded_at || isAdminEmail(profile.email)) continue;

    const userInvoices = invoicesByUser.get(profile.id) ?? [];
    const remindersSent = sentCountByUser.get(profile.id) ?? 0;
    // Nothing to say → no email. An empty digest trains people to ignore it.
    if (userInvoices.length === 0 && remindersSent === 0) {
      skipped++;
      continue;
    }

    // Retried runs (or a manual trigger) must not double-send within the week.
    if (profile.digest_sent_at && nowMs - new Date(profile.digest_sent_at).getTime() < RESEND_GUARD_MS) {
      skipped++;
      continue;
    }

    const totalsByCurrency = new Map<string, number>();
    for (const invoice of userInvoices) {
      totalsByCurrency.set(
        invoice.currency,
        (totalsByCurrency.get(invoice.currency) ?? 0) + Number(invoice.amount)
      );
    }
    const totalOutstandingLabel =
      [...totalsByCurrency.entries()].map(([currency, sum]) => formatMoney(sum, currency)).join(" + ") ||
      formatMoney(0, "EUR");

    const overdue: WeeklyDigestOverdueLine[] = userInvoices
      .map((invoice) => ({ invoice, daysOverdue: -daysUntil(invoice.due_date) }))
      .filter(({ daysOverdue }) => daysOverdue > 0)
      .sort((a, b) => b.daysOverdue - a.daysOverdue)
      .slice(0, MAX_OVERDUE_LINES)
      .map(({ invoice, daysOverdue }) => ({
        label: [customerName.get(invoice.customer_id) ?? "Client", invoice.invoice_number]
          .filter(Boolean)
          .join(" · "),
        amountLabel: formatMoney(Number(invoice.amount), invoice.currency),
        daysOverdue,
        markPaidUrl: linkTokensEnabled()
          ? `${appUrl}/email/mark-paid?token=${signInvoiceLink("mark-paid", invoice.id, MARK_PAID_LINK_EXPIRY_DAYS)}`
          : undefined,
      }));

    try {
      const { error } = await resend.emails.send({
        from: ACCOUNT_FROM_EMAIL,
        to: profile.email,
        subject: "Your Chasry weekly summary",
        react: WeeklyDigestEmail({
          appUrl,
          totalOutstandingLabel,
          unpaidCount: userInvoices.length,
          remindersSentLastWeek: remindersSent,
          overdue,
        }),
      });
      if (error) throw new Error(error.message);

      await supabase
        .from("profiles")
        .update({ digest_sent_at: new Date().toISOString() })
        .eq("id", profile.id);
      // Every digest counts against the Resend quota, so each one gets a log row
      // (digest_sent_at alone only remembers the latest per user).
      await logEmailSend(supabase, { userId: profile.id, kind: "digest" });
      sent++;
    } catch (err) {
      Sentry.captureException(err, {
        tags: { job: "weekly-digest", stage: "send" },
        extra: { userId: profile.id },
      });
      failed++;
    }
  }

  const { error: heartbeatError } = await supabase
    .from("cron_runs")
    .insert({ job: "weekly-digest", sent, failed, skipped });
  if (heartbeatError) console.error("cron/weekly-digest: heartbeat insert failed", heartbeatError);

  return NextResponse.json({ sent, skipped, failed });
}
