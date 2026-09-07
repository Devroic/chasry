import { getAppUrl } from "@/lib/constants";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { handleCronRequest } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend, REMINDERS_FROM_EMAIL, ACCOUNT_FROM_EMAIL } from "@/lib/resend";
import { addDaysUtc, addMonthsClampedUtc } from "@/lib/reminders";
import { formatDate, formatMoney } from "@/lib/format";
import { buildReminderEmail } from "@/lib/reminder-email";
import { buildEmailAttachment } from "@/lib/invoice-attachment";
import RecurringInvoiceCreatedEmail from "@/emails/recurring-invoice-created";
import { isPro } from "@/lib/plan";
import { suggestNextInvoiceNumber } from "@/lib/invoice-number";
import { linkTokensEnabled, signInvoiceLink } from "@/lib/link-token";
import { logEmailSend } from "@/lib/email-log";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** How long a *failed* send keeps retrying before giving up on a likely-undeliverable address. */
const FAILED_RETRY_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

/** Days before its due date a recurring successor is created, so its before-due reminders fire. */
const RECURRING_LEAD_DAYS = 14;

/** How long a client's "I've paid" link stays valid after the reminder is sent. */
const CLAIM_LINK_EXPIRY_DAYS = 60;


/** Heartbeat row so /admin/emails can tell a quiet run apart from a missed one. */
async function recordCronRun(
  supabase: ReturnType<typeof createAdminClient>,
  job: string,
  counts: { sent: number; failed: number; skipped: number }
) {
  const { error } = await supabase.from("cron_runs").insert({ job, ...counts });
  if (error) console.error(`cron/${job}: heartbeat insert failed`, error);
}

export async function GET(request: Request) {
  return handleCronRequest(request, {
    monitorSlug: "send-reminders",
    // Mirrors vercel.json's schedule for this route.
    schedule: "0 7 * * *",
    run: runReminderSweep,
  });
}

async function runReminderSweep() {
  const supabase = createAdminClient();

  // Reminders send for every account regardless of plan — plan only limits active invoice count.
  const [{ data: profiles, error: profilesError }, { data: settings, error: settingsError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, business_name, email, payment_link, reminder_locale, subscription_status, suspended_at"),
      supabase.from("reminder_settings").select("user_id, offsets, enabled, copy_self"),
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

  // Suspended accounts drop out of the whole sweep (reminders and recurring rolls).
  const activeProfiles = (profiles ?? []).filter((p) => !p.suspended_at);
  const allUserIds = activeProfiles.map((p) => p.id);
  const profileById = new Map(activeProfiles.map((p) => [p.id, p]));
  const defaultSettingsByUser = new Map((settings ?? []).map((s) => [s.user_id, s]));

  if (allUserIds.length === 0) {
    await recordCronRun(supabase, "send-reminders", { sent: 0, failed: 0, skipped: 0 });
    return NextResponse.json({ checked: 0, sent: 0, skipped: 0, failed: 0 });
  }

  // Roll first, so a successor created today is in place before its reminder window starts.
  const rolled = await rollRecurringInvoices(supabase, profileById, defaultSettingsByUser);

  const { data: invoices, error: invoicesError } = await supabase
    .from("invoices")
    .select(
      "id, user_id, customer_id, invoice_number, amount, currency, due_date, reminder_offsets, reminder_enabled, snoozed_until, paid_claimed_at, attachment_filename, attachment_content_type, attachment_data"
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
    await recordCronRun(supabase, "send-reminders", { sent: 0, failed: 0, skipped: 0 });
    return NextResponse.json({ checked: 0, sent: 0, skipped: 0, failed: 0, rolled });
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

  // Only 'sent' and 'skipped' are terminal; 'failed' retries on the next run.
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

    // A pending "I've paid" claim holds all chasing until the owner confirms or dismisses it.
    if (invoice.paid_claimed_at) continue;

    // Snoozed: total silence, nothing marked skipped until the first run after the snooze ends.
    if (
      invoice.snoozed_until &&
      todayUtcMidnight < new Date(`${invoice.snoozed_until}T00:00:00Z`).getTime()
    ) {
      continue;
    }

    const offsets = invoice.reminder_offsets ?? customer.reminder_offsets ?? defaultSettings.offsets;

    const businessName = profile.business_name || profile.email;
    const paymentLink = customer.payment_link ?? profile.payment_link ?? undefined;
    const locale = customer.reminder_locale ?? profile.reminder_locale;

    // Each offset gets one chance, on its target day: miss it and it's skipped, never sent late.
    for (const offsetDays of offsets) {
      const key = `${invoice.id}:${offsetDays}`;
      if (settled.has(key)) continue;

      const targetMs = addDaysUtc(invoice.due_date, offsetDays).getTime();
      const isRetry = failedBefore.has(key);

      if (isRetry) {
        // Bounded window, so a permanently undeliverable address stops retrying.
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
      const appUrl = getAppUrl();
      const { element, subject } = buildReminderEmail({
        offsetDays,
        businessName,
        invoiceNumber: invoice.invoice_number,
        amount: Number(invoice.amount),
        currency: invoice.currency,
        dueDate: invoice.due_date,
        paymentLink,
        locale,
        // Free plan carries the linked "via Chasry" footer; Pro is brand-free.
        showBranding: !isPro(profile.subscription_status),
        claimUrl: linkTokensEnabled()
          ? `${appUrl}/paid/${signInvoiceLink("claim-paid", invoice.id, CLAIM_LINK_EXPIRY_DAYS)}`
          : undefined,
      });

      try {
        const { data, error } = await resend.emails.send({
          from: REMINDERS_FROM_EMAIL,
          to: customer.email,
          replyTo: profile.email,
          // "Send me a copy": counts as a second recipient against the Resend quota.
          bcc: defaultSettings.copy_self ? profile.email : undefined,
          subject,
          react: element,
          // Attachments are Pro-only, so a stored PDF stops sending after a downgrade.
          attachments: isPro(profile.subscription_status) ? buildEmailAttachment(invoice) : undefined,
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
            // Explicit, so a retried failure flipping to "sent" reflects THIS attempt.
            sent_at: new Date().toISOString(),
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
            sent_at: new Date().toISOString(),
          },
          { onConflict: "invoice_id,offset_days" }
        );
        failed++;
      }
    }
  }

  await recordCronRun(supabase, "send-reminders", { sent, failed, skipped });
  return NextResponse.json({ checked, sent, skipped, failed, rolled });
}

type SweepProfile = {
  id: string;
  business_name: string | null;
  email: string;
  subscription_status: "none" | "active" | "past_due" | "canceled";
};

/** Rolls each recurring chain's next occurrence; only its newest link has recurred_at = null. */
async function rollRecurringInvoices(
  supabase: ReturnType<typeof createAdminClient>,
  profileById: Map<string, SweepProfile>,
  settingsByUser: Map<string, { offsets: number[]; enabled: boolean }>
): Promise<number> {
  const { data: candidates, error } = await supabase
    .from("invoices")
    .select(
      "id, user_id, customer_id, invoice_number, amount, currency, due_date, notes, payment_link, reminder_offsets, reminder_enabled, attachment_filename, status"
    )
    .eq("recurring", "monthly")
    .is("recurred_at", null)
    .in("status", ["unpaid", "paid"]);

  if (error) {
    Sentry.captureException(error, { tags: { job: "send-reminders", stage: "roll-recurring" } });
    return 0;
  }
  if (!candidates || candidates.length === 0) return 0;

  // Names for the owner notification, overrides to compute the successor's first reminder.
  const { data: rollCustomers } = await supabase
    .from("customers")
    .select("id, name, reminder_offsets, reminder_enabled")
    .in("id", [...new Set(candidates.map((c) => c.customer_id))]);
  const rollCustomerById = new Map((rollCustomers ?? []).map((c) => [c.id, c]));

  const now = new Date();
  const todayUtcMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  let rolled = 0;

  for (const invoice of candidates) {
    // Fast-forward backdated chains: create ONE successor for the first still-relevant period.
    let nextDueDate = addMonthsClampedUtc(invoice.due_date, 1);
    let guard = 0;
    while (
      addDaysUtc(nextDueDate, RECURRING_LEAD_DAYS).getTime() < todayUtcMidnight &&
      guard++ < 120
    ) {
      nextDueDate = addMonthsClampedUtc(nextDueDate, 1);
    }
    const createFromMs = addDaysUtc(nextDueDate, -RECURRING_LEAD_DAYS).getTime();
    if (todayUtcMidnight < createFromMs) continue;

    const profile = profileById.get(invoice.user_id);
    if (!profile) continue;

    // Repeating is Pro-only: after a downgrade the chain pauses (not canceled), as the dialog promises.
    if (!isPro(profile.subscription_status)) continue;

    // Claim the source first (only if unclaimed) so a crash/retry can't create duplicate successors.
    const { data: claimedRows, error: claimError } = await supabase
      .from("invoices")
      .update({ recurred_at: new Date().toISOString() })
      .eq("id", invoice.id)
      .is("recurred_at", null)
      .select("id");
    if (claimError || !claimedRows?.length) {
      if (claimError) {
        Sentry.captureException(claimError, {
          tags: { job: "send-reminders", stage: "roll-claim" },
          extra: { invoiceId: invoice.id },
        });
      }
      continue;
    }

    // Attachments and snoozes are period-specific, so they don't carry over.
    const { data: created, error: insertError } = await supabase
      .from("invoices")
      .insert({
        user_id: invoice.user_id,
        customer_id: invoice.customer_id,
        invoice_number: suggestNextInvoiceNumber(invoice.invoice_number) || null,
        amount: invoice.amount,
        currency: invoice.currency,
        due_date: nextDueDate,
        notes: invoice.notes,
        payment_link: invoice.payment_link,
        reminder_offsets: invoice.reminder_offsets,
        reminder_enabled: invoice.reminder_enabled,
        recurring: "monthly",
      })
      .select("id")
      .single();

    if (insertError || !created) {
      Sentry.captureException(insertError, {
        tags: { job: "send-reminders", stage: "roll-recurring" },
        extra: { invoiceId: invoice.id },
      });
      // Release the claim so tomorrow retries; if this too fails, the chain pauses, not duplicates.
      const { error: releaseError } = await supabase
        .from("invoices")
        .update({ recurred_at: null })
        .eq("id", invoice.id);
      if (releaseError) {
        Sentry.captureException(releaseError, {
          tags: { job: "send-reminders", stage: "roll-release" },
          extra: { invoiceId: invoice.id },
        });
      }
      continue;
    }
    rolled++;

    await notifyRecurringInvoiceCreated({
      supabase,
      profile,
      customer: rollCustomerById.get(invoice.customer_id),
      accountSettings: settingsByUser.get(invoice.user_id),
      sourceInvoice: invoice,
      createdInvoiceId: created.id,
      nextDueDate,
      todayUtcMidnight,
    });
  }

  return rolled;
}

/** Notifies the owner an invoice was auto-created; a failed notification never fails the roll. */
async function notifyRecurringInvoiceCreated({
  supabase,
  profile,
  customer,
  accountSettings,
  sourceInvoice,
  createdInvoiceId,
  nextDueDate,
  todayUtcMidnight,
}: {
  supabase: ReturnType<typeof createAdminClient>;
  profile: SweepProfile;
  customer?: { name: string; reminder_offsets: number[] | null; reminder_enabled: boolean | null };
  accountSettings?: { offsets: number[]; enabled: boolean };
  sourceInvoice: {
    amount: number;
    currency: string;
    reminder_offsets: number[] | null;
    reminder_enabled: boolean | null;
    attachment_filename: string | null;
  };
  createdInvoiceId: string;
  nextDueDate: string;
  todayUtcMidnight: number;
}) {
  try {
    // Same cascade the sweep uses; the successor copied the invoice override.
    const enabled =
      sourceInvoice.reminder_enabled ?? customer?.reminder_enabled ?? accountSettings?.enabled ?? true;
    const offsets =
      sourceInvoice.reminder_offsets ?? customer?.reminder_offsets ?? accountSettings?.offsets ?? [];

    // Earliest reminder that can still actually fire (past-dated steps get skipped).
    const firstReminderMs = enabled
      ? offsets
          .map((offset) => addDaysUtc(nextDueDate, offset).getTime())
          .filter((ms) => ms >= todayUtcMidnight)
          .sort((a, b) => a - b)[0]
      : undefined;

    const { error: sendError } = await resend.emails.send({
      from: ACCOUNT_FROM_EMAIL,
      to: profile.email,
      subject: `Next month's invoice for ${customer?.name ?? "your client"} is ready`,
      react: RecurringInvoiceCreatedEmail({
        appUrl: getAppUrl(),
        clientName: customer?.name ?? "your client",
        amountLabel: formatMoney(Number(sourceInvoice.amount), sourceInvoice.currency),
        dueDateLabel: formatDate(nextDueDate, "en"),
        firstReminderLabel: firstReminderMs ? formatDate(new Date(firstReminderMs), "en") : undefined,
        hadAttachment: sourceInvoice.attachment_filename != null,
        invoiceId: createdInvoiceId,
      }),
    });
    if (sendError) throw new Error(sendError.message);
    await logEmailSend(supabase, { userId: profile.id, kind: "recurring_notice" });
  } catch (err) {
    Sentry.captureException(err, {
      tags: { job: "send-reminders", stage: "roll-notify" },
      extra: { invoiceId: createdInvoiceId },
    });
  }
}
