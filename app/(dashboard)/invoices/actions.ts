"use server";

import { getAppUrl } from "@/lib/constants";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import * as Sentry from "@sentry/nextjs";
import { requireUser, getProfile } from "@/lib/auth";
import { isPro, FREE_INVOICE_LIMIT } from "@/lib/plan";
import { invoiceSchema } from "@/lib/validations/invoice";
import { resend, REMINDERS_FROM_EMAIL } from "@/lib/resend";
import { buildReminderEmail } from "@/lib/reminder-email";
import { addDaysUtc } from "@/lib/reminders";
import { decodeReminderOverride } from "@/lib/reminder-override";
import { logEmailSend } from "@/lib/email-log";
import {
  buildEmailAttachment,
  encodeBytea,
  looksLikePdf,
  MAX_ATTACHMENT_BYTES,
} from "@/lib/invoice-attachment";
import { linkTokensEnabled, signInvoiceLink } from "@/lib/link-token";
import { todayInTimeZone } from "@/lib/format";
import { getUserTimeZone } from "@/lib/timezone";
import type { Translator } from "@/lib/validations/shared";

export type InvoiceFormState = { error?: string } | null;

/**
 * Validates and encodes an optional attachment. `fields: null` means no new file was submitted,
 * so the existing one must be left alone rather than cleared.
 */
async function processAttachmentUpload(
  formData: FormData,
  userId: string,
  tErrors: Awaited<ReturnType<typeof getTranslations<"invoices.form.errors">>>
): Promise<
  | { error: string }
  | {
      fields: {
        attachment_filename: string;
        attachment_content_type: string;
        attachment_data: string;
      } | null;
    }
> {
  const file = formData.get("attachment");
  if (!(file instanceof File) || file.size === 0) {
    return { fields: null };
  }

  const profile = await getProfile(userId);
  if (!isPro(profile?.subscription_status ?? "none")) {
    return { error: tErrors("attachmentRequiresPro") };
  }

  if (file.size > MAX_ATTACHMENT_BYTES) {
    return { error: tErrors("attachmentTooLarge") };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!looksLikePdf(buffer)) {
    return { error: tErrors("attachmentMustBePdf") };
  }

  return {
    fields: {
      attachment_filename: file.name,
      attachment_content_type: "application/pdf",
      attachment_data: encodeBytea(buffer),
    },
  };
}

function parseInvoiceForm(formData: FormData, t: Translator) {
  return invoiceSchema(t).safeParse({
    customer_id: formData.get("customer_id"),
    invoice_number: formData.get("invoice_number"),
    amount: formData.get("amount"),
    currency: formData.get("currency") || "EUR",
    due_date: formData.get("due_date"),
    notes: formData.get("notes"),
    recurring: formData.get("recurring") || "none",
    ...decodeReminderOverride(formData),
  });
}

/** Recurring is a Pro feature — the real gate, not just the UI disabling the field. */
async function recurringAllowed(userId: string, recurring: "none" | "monthly") {
  if (recurring === "none") return true;
  const profile = await getProfile(userId);
  return isPro(profile?.subscription_status ?? "none");
}

type ActionSupabase = Awaited<ReturnType<typeof requireUser>>["supabase"];

/** True when a free user already has FREE_INVOICE_LIMIT active invoices. */
async function atFreeInvoiceLimit(supabase: ActionSupabase, userId: string) {
  const profile = await getProfile(userId);
  if (isPro(profile?.subscription_status ?? "none")) return false;

  const { count } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "unpaid");
  return (count ?? 0) >= FREE_INVOICE_LIMIT;
}

/**
 * Everything a user-initiated reminder send needs, with the same cascade the cron resolves.
 * Null when the invoice isn't the user's.
 */
async function loadReminderSendContext(supabase: ActionSupabase, userId: string, invoiceId: string) {
  // Only the customer fetch depends on the invoice row; the rest batch.
  const [{ data: profile }, { data: accountSettings }, { data: invoice }] = await Promise.all([
    supabase
      .from("profiles")
      .select("business_name, email, payment_link, reminder_locale, subscription_status")
      .eq("id", userId)
      .single(),
    supabase
      .from("reminder_settings")
      .select("offsets, enabled, copy_self")
      .eq("user_id", userId)
      .single(),
    supabase
      .from("invoices")
      .select(
        "id, invoice_number, amount, currency, due_date, customer_id, status, reminder_offsets, reminder_enabled, snoozed_until, paid_claimed_at, attachment_filename, attachment_content_type, attachment_data"
      )
      .eq("id", invoiceId)
      .eq("user_id", userId)
      .single(),
  ]);

  const { data: customer } = invoice
    ? await supabase
        .from("customers")
        .select("name, email, payment_link, reminder_offsets, reminder_enabled, reminder_locale")
        .eq("id", invoice.customer_id)
        .single()
    : { data: null };

  if (!invoice || !profile || !customer) return null;

  return {
    profile,
    accountSettings,
    invoice,
    customer,
    enabled: invoice.reminder_enabled ?? customer.reminder_enabled ?? accountSettings?.enabled ?? true,
    offsets: invoice.reminder_offsets ?? customer.reminder_offsets ?? accountSettings?.offsets ?? [],
    businessName: profile.business_name || profile.email,
    paymentLink: customer.payment_link ?? profile.payment_link ?? undefined,
    locale: customer.reminder_locale ?? profile.reminder_locale,
    showBranding: !isPro(profile.subscription_status),
    claimUrl: linkTokensEnabled()
      ? `${getAppUrl()}/paid/${signInvoiceLink("claim-paid", invoice.id, 60)}`
      : undefined,
  };
}

export async function createInvoice(
  _prev: InvoiceFormState,
  formData: FormData
): Promise<InvoiceFormState> {
  const t = await getTranslations("validation");
  const tErrors = await getTranslations("invoices.form.errors");

  const parsed = parseInvoiceForm(formData, t);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? t("invalidInput") };

  const { supabase, user } = await requireUser();

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("id", parsed.data.customer_id)
    .eq("user_id", user.id)
    .single();
  if (!customer) return { error: tErrors("invalidClient") };

  if (!(await recurringAllowed(user.id, parsed.data.recurring))) {
    return { error: tErrors("recurringRequiresPro") };
  }

  // The real free-plan gate, not just the UI hiding the form.
  if (await atFreeInvoiceLimit(supabase, user.id)) {
    return { error: tErrors("limitReachedCreate", { limit: FREE_INVOICE_LIMIT }) };
  }

  const attachmentResult = await processAttachmentUpload(formData, user.id, tErrors);
  if ("error" in attachmentResult) return { error: attachmentResult.error };

  const { data, error } = await supabase
    .from("invoices")
    .insert({ ...parsed.data, user_id: user.id, ...(attachmentResult.fields ?? {}) })
    .select("id")
    .single();

  if (error || !data) return { error: tErrors("createFailed") };

  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  redirect(`/invoices/${data.id}`);
}

export async function updateInvoice(
  invoiceId: string,
  _prev: InvoiceFormState,
  formData: FormData
): Promise<InvoiceFormState> {
  const t = await getTranslations("validation");
  const tErrors = await getTranslations("invoices.form.errors");
  const tCommon = await getTranslations("common");

  const parsed = parseInvoiceForm(formData, t);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? t("invalidInput") };

  const { supabase, user } = await requireUser();

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("id", parsed.data.customer_id)
    .eq("user_id", user.id)
    .single();
  if (!customer) return { error: tErrors("invalidClient") };

  if (!(await recurringAllowed(user.id, parsed.data.recurring))) {
    return { error: tErrors("recurringRequiresPro") };
  }

  const attachmentResult = await processAttachmentUpload(formData, user.id, tErrors);
  if ("error" in attachmentResult) return { error: attachmentResult.error };

  const { error } = await supabase
    .from("invoices")
    .update({ ...parsed.data, ...(attachmentResult.fields ?? {}) })
    .eq("id", invoiceId)
    .eq("user_id", user.id);

  if (error) return { error: tCommon("saveFailed") };

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/dashboard");
  redirect(`/invoices/${invoiceId}`);
}

export async function markInvoicePaid(invoiceId: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("invoices")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", invoiceId)
    .eq("user_id", user.id);
  if (error) return { error: (await getTranslations("common"))("saveFailed") };

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/dashboard");
}

export async function reopenInvoice(invoiceId: string) {
  const { supabase, user } = await requireUser();

  // Reopening adds back an active invoice, subject to the same free-plan limit as creating one.
  // Returned (not thrown): production masks thrown Server Action messages.
  if (await atFreeInvoiceLimit(supabase, user.id)) {
    const tErrors = await getTranslations("invoices.form.errors");
    return { error: tErrors("limitReachedReopen", { limit: FREE_INVOICE_LIMIT }) };
  }

  // Clears any leftover pause state — a reopened invoice should chase again.
  const { error } = await supabase
    .from("invoices")
    .update({ status: "unpaid", paid_at: null, snoozed_until: null, paid_claimed_at: null })
    .eq("id", invoiceId)
    .eq("user_id", user.id);
  if (error) return { error: (await getTranslations("common"))("saveFailed") };

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/dashboard");
}

export async function deleteInvoice(invoiceId: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("invoices").delete().eq("id", invoiceId).eq("user_id", user.id);
  if (error) return { error: (await getTranslations("common"))("saveFailed") };
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  redirect("/invoices");
}

/** Clears a previously-attached file, independent of the edit form's Save. */
export async function removeInvoiceAttachment(invoiceId: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("invoices")
    .update({ attachment_filename: null, attachment_content_type: null, attachment_data: null })
    .eq("id", invoiceId)
    .eq("user_id", user.id);
  if (error) return { error: (await getTranslations("common"))("saveFailed") };

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath(`/invoices/${invoiceId}/edit`);
}

/**
 * Pauses reminders until `dateIso` (exclusive). Steps whose day passes while paused are skipped,
 * never sent late, same rule as the cron.
 */
export async function snoozeInvoice(invoiceId: string, dateIso: string) {
  const { supabase, user } = await requireUser();
  const tErrors = await getTranslations("invoices.form.errors");

  // The dialog builds its presets from the user's LOCAL day, which near midnight is a
  // day off from UTC in either direction — accept "tomorrow" relative to whichever day
  // is earlier, and bound the max from whichever is later.
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(dateIso) ? new Date(`${dateIso}T00:00:00Z`) : null;
  const now = new Date();
  const todayUtcMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const todayUserMidnight = new Date(`${todayInTimeZone(await getUserTimeZone())}T00:00:00Z`).getTime();
  const minMidnight = Math.min(todayUtcMidnight, todayUserMidnight);
  const maxMs = Math.max(todayUtcMidnight, todayUserMidnight) + 90 * 86_400_000;
  if (!parsed || Number.isNaN(parsed.getTime()) || parsed.getTime() <= minMidnight || parsed.getTime() > maxMs) {
    return { error: tErrors("invalidSnoozeDate") };
  }

  const { error } = await supabase
    .from("invoices")
    .update({ snoozed_until: dateIso })
    .eq("id", invoiceId)
    .eq("user_id", user.id)
    .eq("status", "unpaid");
  if (error) return { error: (await getTranslations("common"))("saveFailed") };

  revalidatePath(`/invoices/${invoiceId}`);
}

export async function unsnoozeInvoice(invoiceId: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("invoices")
    .update({ snoozed_until: null })
    .eq("id", invoiceId)
    .eq("user_id", user.id);
  if (error) return { error: (await getTranslations("common"))("saveFailed") };

  revalidatePath(`/invoices/${invoiceId}`);
}

/** Rejects a client's "I've paid" claim — reminders resume on the next run. */
export async function dismissPaidClaim(invoiceId: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("invoices")
    .update({ paid_claimed_at: null })
    .eq("id", invoiceId)
    .eq("user_id", user.id);
  if (error) return { error: (await getTranslations("common"))("saveFailed") };

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
}

/** Sends one preview email per scheduled offset, via the same builder and cascade as the cron. */
export async function sendPreviewReminder(invoiceId: string) {
  const { supabase, user } = await requireUser();
  const tErrors = await getTranslations("invoices.form.errors");

  const context = await loadReminderSendContext(supabase, user.id, invoiceId);
  if (!context) return { error: tErrors("notFound") };
  if (context.offsets.length === 0) {
    return { error: tErrors("noRemindersScheduled") };
  }

  const { invoice, customer, profile } = context;
  for (const offsetDays of [...context.offsets].sort((a, b) => a - b)) {
    const { element, subject } = buildReminderEmail({
      offsetDays,
      businessName: context.businessName,
      clientName: customer.name,
      invoiceNumber: invoice.invoice_number,
      amount: Number(invoice.amount),
      currency: invoice.currency,
      dueDate: invoice.due_date,
      paymentLink: context.paymentLink,
      subjectPrefix: "[Preview] ",
      locale: context.locale,
      showBranding: context.showBranding,
      // Inert, like the on-screen preview: a real token here would let the owner
      // accidentally claim their own invoice while testing.
      claimUrl: "#",
    });

    const { error } = await resend.emails.send({
      from: REMINDERS_FROM_EMAIL,
      to: profile.email,
      replyTo: profile.email,
      subject,
      react: element,
      // Attachments are Pro-only; the preview mirrors what a client would get.
      attachments: isPro(profile.subscription_status) ? buildEmailAttachment(invoice) : undefined,
    });
    if (error) {
      Sentry.captureException(new Error(error.message), { tags: { job: "send-preview" } });
      return { error: (await getTranslations("invoiceActionErrors"))("previewFailed") };
    }
  }

  await logEmailSend(supabase, {
    userId: user.id,
    kind: "reminder_preview",
    recipientCount: context.offsets.length,
  });

  return { count: context.offsets.length };
}

/**
 * Manually fires one not-yet-attempted reminder due today, for invoices created after the cron
 * run. Mirrors the cron's send path exactly.
 */
export async function sendReminderNow(invoiceId: string, offsetDays: number) {
  const { supabase, user } = await requireUser();
  const tErrors = await getTranslations("invoices.form.errors");

  const context = await loadReminderSendContext(supabase, user.id, invoiceId);
  if (!context) return { error: tErrors("notFound") };
  const { invoice, customer, profile, accountSettings } = context;

  // Re-validates what the UI gates, since the action is directly callable. "Today" accepts the
  // UTC day or the user's own day, which near midnight legitimately differ by one.
  const targetMs = addDaysUtc(invoice.due_date, offsetDays).getTime();
  const now = new Date();
  const todayUtcMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const todayUserIso = todayInTimeZone(await getUserTimeZone());
  const todayUserMidnight = new Date(`${todayUserIso}T00:00:00Z`).getTime();

  if (
    invoice.status !== "unpaid" ||
    !context.enabled ||
    // A pending "I've paid" claim or an active snooze pauses all chasing.
    invoice.paid_claimed_at != null ||
    (invoice.snoozed_until != null && todayUserIso < invoice.snoozed_until) ||
    !context.offsets.includes(offsetDays) ||
    (targetMs !== todayUtcMidnight && targetMs !== todayUserMidnight)
  ) {
    return { error: tErrors("cannotSendNow") };
  }

  const { data: existingLog } = await supabase
    .from("reminder_logs")
    .select("status")
    .eq("invoice_id", invoiceId)
    .eq("offset_days", offsetDays)
    .maybeSingle();
  if (existingLog) return { error: tErrors("cannotSendNow") };

  const { element, subject } = buildReminderEmail({
    offsetDays,
    businessName: context.businessName,
    clientName: customer.name,
    invoiceNumber: invoice.invoice_number,
    amount: Number(invoice.amount),
    currency: invoice.currency,
    dueDate: invoice.due_date,
    locale: context.locale,
    paymentLink: context.paymentLink,
    showBranding: context.showBranding,
    claimUrl: context.claimUrl,
    // Word the day-count as of the step's own day, matching what the cron send would have said.
    daysUntilDueOverride: -offsetDays,
  });

  try {
    const { data, error } = await resend.emails.send({
      from: REMINDERS_FROM_EMAIL,
      to: customer.email,
      replyTo: profile.email,
      bcc: accountSettings?.copy_self ? profile.email : undefined,
      subject,
      react: element,
      // Attachments are Pro-only, matching the cron sweep.
      attachments: isPro(profile.subscription_status) ? buildEmailAttachment(invoice) : undefined,
    });
    if (error) throw new Error(error.message);

    // Plain insert, not upsert — RLS only grants INSERT on reminder_logs, not UPDATE.
    const { error: logError } = await supabase.from("reminder_logs").insert({
      invoice_id: invoiceId,
      user_id: user.id,
      offset_days: offsetDays,
      status: "sent",
      resend_message_id: data?.id ?? null,
    });
    if (logError) throw logError;
  } catch (err) {
    Sentry.captureException(err, {
      tags: { job: "send-reminder-now" },
      extra: { invoiceId, offsetDays },
    });
    await supabase.from("reminder_logs").insert({
      invoice_id: invoiceId,
      user_id: user.id,
      offset_days: offsetDays,
      status: "failed",
      error: err instanceof Error ? err.message : "Unknown error",
    });
    return { error: tErrors("sendFailed") };
  }

  revalidatePath(`/invoices/${invoiceId}`);
}
