"use server";

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
import {
  buildEmailAttachment,
  encodeBytea,
  looksLikePdf,
  MAX_ATTACHMENT_BYTES,
} from "@/lib/invoice-attachment";
import type { Translator } from "@/lib/validations/shared";

export type InvoiceFormState = { error?: string } | null;

/**
 * Validates and encodes an optional attachment from the invoice form, used
 * by both createInvoice and updateInvoice so the checks (Pro plan, size,
 * real PDF content) live in exactly one place. Returns `fields: null` when
 * no new file was submitted — the create form always starts empty, and the
 * edit form's file input can't be pre-filled with the existing file, so
 * "nothing submitted" must mean "leave whatever's already there alone",
 * not "clear it."
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
    ...decodeReminderOverride(formData),
  });
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

  // Server-side enforcement of the free-plan invoice limit — the UI already
  // hides the form at this point, but this is the real gate. Goes through
  // getProfile() (not an ad hoc query) so an admin's simulated Free/Pro view
  // (see lib/auth.ts) is honored here too, not just cosmetically in the UI.
  const profile = await getProfile(user.id);
  if (!isPro(profile?.subscription_status ?? "none")) {
    const { count } = await supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "unpaid");
    if ((count ?? 0) >= FREE_INVOICE_LIMIT) {
      return { error: tErrors("limitReachedCreate", { limit: FREE_INVOICE_LIMIT }) };
    }
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
  await supabase
    .from("invoices")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", invoiceId)
    .eq("user_id", user.id);

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/dashboard");
}

export async function reopenInvoice(invoiceId: string) {
  const { supabase, user } = await requireUser();

  // Reopening a paid invoice adds back an active invoice — subject to the
  // same free-plan limit as creating a new one. Goes through getProfile()
  // so an admin's simulated Free/Pro view (see lib/auth.ts) applies here too.
  const profile = await getProfile(user.id);
  if (!isPro(profile?.subscription_status ?? "none")) {
    const { count } = await supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "unpaid");
    if ((count ?? 0) >= FREE_INVOICE_LIMIT) {
      const tErrors = await getTranslations("invoices.form.errors");
      throw new Error(tErrors("limitReachedReopen", { limit: FREE_INVOICE_LIMIT }));
    }
  }

  await supabase
    .from("invoices")
    .update({ status: "unpaid", paid_at: null })
    .eq("id", invoiceId)
    .eq("user_id", user.id);

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/dashboard");
}

export async function deleteInvoice(invoiceId: string) {
  const { supabase, user } = await requireUser();
  await supabase.from("invoices").delete().eq("id", invoiceId).eq("user_id", user.id);
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  redirect("/invoices");
}

/** Clears a previously-attached file. The edit form's "Remove" control —
 * separate from the main Save action since it needs to work without
 * touching (or requiring) the rest of the invoice form. */
export async function removeInvoiceAttachment(invoiceId: string) {
  const { supabase, user } = await requireUser();
  await supabase
    .from("invoices")
    .update({ attachment_filename: null, attachment_content_type: null, attachment_data: null })
    .eq("id", invoiceId)
    .eq("user_id", user.id);

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath(`/invoices/${invoiceId}/edit`);
}

/**
 * Sends one preview email per offset this invoice actually has scheduled
 * (invoice override → client override → account default, same cascade the
 * real cron uses), each built by the exact same buildReminderEmail() the
 * cron send uses — so what lands in the inbox is a true preview of every
 * tone (before/overdue/seriously overdue) this invoice will really send,
 * not always the same generic "7 days before" example. replyTo is set to
 * the account owner's real email too, same as the real send, so testing
 * "reply to this email" from a preview actually goes somewhere real.
 */
export async function sendPreviewReminder(invoiceId: string) {
  const { supabase, user } = await requireUser();

  const [{ data: profile }, { data: accountSettings }] = await Promise.all([
    supabase.from("profiles").select("business_name, email, payment_link").eq("id", user.id).single(),
    supabase.from("reminder_settings").select("offsets").eq("user_id", user.id).single(),
  ]);

  const { data: invoice } = await supabase
    .from("invoices")
    .select(
      "invoice_number, amount, currency, due_date, customer_id, reminder_offsets, attachment_filename, attachment_content_type, attachment_data"
    )
    .eq("id", invoiceId)
    .eq("user_id", user.id)
    .single();

  const { data: customer } = invoice
    ? await supabase
        .from("customers")
        .select("name, payment_link, reminder_offsets")
        .eq("id", invoice.customer_id)
        .single()
    : { data: null };

  const tErrors = await getTranslations("invoices.form.errors");
  if (!invoice || !profile || !customer) throw new Error(tErrors("notFound"));

  const offsets = invoice.reminder_offsets ?? customer.reminder_offsets ?? accountSettings?.offsets ?? [];
  if (offsets.length === 0) {
    throw new Error(tErrors("noRemindersScheduled"));
  }

  const businessName = profile.business_name || profile.email;
  const paymentLink = customer.payment_link ?? profile.payment_link ?? undefined;

  for (const offsetDays of [...offsets].sort((a, b) => a - b)) {
    const { element, subject } = buildReminderEmail({
      offsetDays,
      businessName,
      clientName: customer.name,
      invoiceNumber: invoice.invoice_number,
      amount: Number(invoice.amount),
      currency: invoice.currency,
      dueDate: invoice.due_date,
      paymentLink,
      subjectPrefix: "[Preview] ",
    });

    await resend.emails.send({
      from: REMINDERS_FROM_EMAIL,
      to: profile.email,
      replyTo: profile.email,
      subject,
      react: element,
      attachments: buildEmailAttachment(invoice),
    });
  }

  return { count: offsets.length };
}

/**
 * Manually fires one reminder whose target date is exactly today and
 * hasn't been attempted yet. The cron (app/api/cron/send-reminders) only
 * gets one chance per offset, its own target day, and won't catch up a
 * day it missed — this is the escape hatch for "I created this invoice
 * after today's daily run already happened." Mirrors the cron's own send
 * path exactly (same buildReminderEmail, same replyTo, same reminder_logs
 * write) so a manually-sent reminder is indistinguishable from one the
 * cron sent itself.
 */
export async function sendReminderNow(invoiceId: string, offsetDays: number) {
  const { supabase, user } = await requireUser();
  const tErrors = await getTranslations("invoices.form.errors");

  const [{ data: profile }, { data: accountSettings }] = await Promise.all([
    supabase.from("profiles").select("business_name, email, payment_link").eq("id", user.id).single(),
    supabase.from("reminder_settings").select("offsets, enabled").eq("user_id", user.id).single(),
  ]);

  const { data: invoice } = await supabase
    .from("invoices")
    .select(
      "invoice_number, amount, currency, due_date, customer_id, status, reminder_offsets, reminder_enabled, attachment_filename, attachment_content_type, attachment_data"
    )
    .eq("id", invoiceId)
    .eq("user_id", user.id)
    .single();

  const { data: customer } = invoice
    ? await supabase
        .from("customers")
        .select("name, email, payment_link, reminder_offsets, reminder_enabled")
        .eq("id", invoice.customer_id)
        .single()
    : { data: null };

  if (!invoice || !profile || !customer) throw new Error(tErrors("notFound"));

  // Everything below re-validates what the UI already only shows this
  // button for — defense against the action being called directly with
  // stale or fabricated arguments, not expected to trigger in normal use.
  const enabled = invoice.reminder_enabled ?? customer.reminder_enabled ?? accountSettings?.enabled ?? true;
  const offsets = invoice.reminder_offsets ?? customer.reminder_offsets ?? accountSettings?.offsets ?? [];
  const targetMs = addDaysUtc(invoice.due_date, offsetDays).getTime();
  const now = new Date();
  const todayUtcMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  if (invoice.status !== "unpaid" || !enabled || !offsets.includes(offsetDays) || targetMs !== todayUtcMidnight) {
    throw new Error(tErrors("cannotSendNow"));
  }

  const { data: existingLog } = await supabase
    .from("reminder_logs")
    .select("status")
    .eq("invoice_id", invoiceId)
    .eq("offset_days", offsetDays)
    .maybeSingle();
  if (existingLog) throw new Error(tErrors("cannotSendNow"));

  const businessName = profile.business_name || profile.email;
  const paymentLink = customer.payment_link ?? profile.payment_link ?? undefined;

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
      attachments: buildEmailAttachment(invoice),
    });
    if (error) throw new Error(error.message);

    // Plain insert, not upsert — we already confirmed above that no row
    // exists for this offset yet, and RLS only grants this user INSERT on
    // reminder_logs (see migration 0010), not UPDATE, so an upsert's
    // ON CONFLICT DO UPDATE branch would be rejected outright.
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
    throw new Error(tErrors("sendFailed"));
  }

  revalidatePath(`/invoices/${invoiceId}`);
}
