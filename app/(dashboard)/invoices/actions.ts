"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { isPro, FREE_INVOICE_LIMIT } from "@/lib/plan";
import { invoiceSchema } from "@/lib/validations/invoice";
import { resend, REMINDERS_FROM_EMAIL } from "@/lib/resend";
import { formatDate, formatMoney } from "@/lib/format";
import { decodeReminderOverride } from "@/lib/reminder-override";
import ReminderBeforeDueEmail from "@/emails/reminder-before-due";

export type InvoiceFormState = { error?: string } | null;

function parseInvoiceForm(formData: FormData) {
  return invoiceSchema.safeParse({
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
  const parsed = parseInvoiceForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { supabase, user } = await requireUser();

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("id", parsed.data.customer_id)
    .eq("user_id", user.id)
    .single();
  if (!customer) return { error: "Choose a valid client." };

  // Server-side enforcement of the free-plan invoice limit — the UI already
  // hides the form at this point, but this is the real gate.
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status")
    .eq("id", user.id)
    .single();
  if (!isPro(profile?.subscription_status ?? "none")) {
    const { count } = await supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "unpaid");
    if ((count ?? 0) >= FREE_INVOICE_LIMIT) {
      return { error: `Free plan is limited to ${FREE_INVOICE_LIMIT} active invoices. Upgrade to Pro for unlimited.` };
    }
  }

  const { data, error } = await supabase
    .from("invoices")
    .insert({ ...parsed.data, user_id: user.id })
    .select("id")
    .single();

  if (error || !data) return { error: "Couldn't save this invoice. Try again." };

  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  redirect(`/invoices/${data.id}`);
}

export async function updateInvoice(
  invoiceId: string,
  _prev: InvoiceFormState,
  formData: FormData
): Promise<InvoiceFormState> {
  const parsed = parseInvoiceForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { supabase, user } = await requireUser();

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("id", parsed.data.customer_id)
    .eq("user_id", user.id)
    .single();
  if (!customer) return { error: "Choose a valid client." };

  const { error } = await supabase
    .from("invoices")
    .update(parsed.data)
    .eq("id", invoiceId)
    .eq("user_id", user.id);

  if (error) return { error: "Couldn't save changes. Try again." };

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
  // same free-plan limit as creating a new one.
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status")
    .eq("id", user.id)
    .single();
  if (!isPro(profile?.subscription_status ?? "none")) {
    const { count } = await supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "unpaid");
    if ((count ?? 0) >= FREE_INVOICE_LIMIT) {
      throw new Error(
        `Free plan is limited to ${FREE_INVOICE_LIMIT} active invoices. Upgrade to Pro to reopen this one.`
      );
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

export async function sendPreviewReminder(invoiceId: string) {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_name, email, payment_link")
    .eq("id", user.id)
    .single();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("invoice_number, amount, currency, due_date, customer_id")
    .eq("id", invoiceId)
    .eq("user_id", user.id)
    .single();
  if (!invoice || !profile) throw new Error("Invoice not found");

  const { data: customer } = await supabase
    .from("customers")
    .select("name, payment_link")
    .eq("id", invoice.customer_id)
    .single();

  const businessName = profile.business_name || profile.email;

  await resend.emails.send({
    from: REMINDERS_FROM_EMAIL,
    to: profile.email,
    subject: `[Preview] Reminder: invoice ${invoice.invoice_number ?? ""} due soon from ${businessName}`.trim(),
    react: ReminderBeforeDueEmail({
      businessName,
      clientName: customer?.name ?? "your client",
      invoiceNumber: invoice.invoice_number ?? undefined,
      amount: formatMoney(Number(invoice.amount), invoice.currency),
      dueDateLabel: `Due ${formatDate(invoice.due_date)}`,
      daysUntilDue: 7,
      paymentLink: customer?.payment_link ?? profile.payment_link ?? undefined,
    }),
  });
}
