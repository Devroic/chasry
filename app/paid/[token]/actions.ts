"use server";

import { getAppUrl } from "@/lib/constants";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyInvoiceLink } from "@/lib/link-token";
import { checkAuthRateLimit } from "@/lib/rate-limit";
import { resend, ACCOUNT_FROM_EMAIL } from "@/lib/resend";
import { logEmailSend } from "@/lib/email-log";
import { formatMoney } from "@/lib/format";
import PaidClaimNotificationEmail from "@/emails/paid-claim-notification";

/** Public unauthenticated action; the signed token is the entire credential. Idempotent. */
export async function claimInvoicePaid(token: string) {
  const invoiceId = verifyInvoiceLink("claim-paid", token);
  if (!invoiceId) return;

  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { success } = await checkAuthRateLimit(`claim-paid:${ip}`);
  if (!success) return;

  const supabase = createAdminClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, user_id, invoice_number, amount, currency, status, paid_claimed_at, customer_id")
    .eq("id", invoiceId)
    .single();

  // Only a first claim on a still-unpaid invoice does anything.
  if (invoice && invoice.status === "unpaid" && !invoice.paid_claimed_at) {
    // paid_claimed_at IS NULL is in the filter, so concurrent clicks can't double-notify.
    const { error, count } = await supabase
      .from("invoices")
      .update({ paid_claimed_at: new Date().toISOString() }, { count: "exact" })
      .eq("id", invoiceId)
      .eq("status", "unpaid")
      .is("paid_claimed_at", null);

    if (!error && (count ?? 0) > 0) {
      revalidatePath(`/invoices/${invoiceId}`);
      revalidatePath("/invoices");
      await notifyOwner(supabase, invoice);
    }
  }

  // Re-render the same page, which now shows the thank-you state.
  redirect(`/paid/${encodeURIComponent(token)}`);
}

async function notifyOwner(
  supabase: ReturnType<typeof createAdminClient>,
  invoice: {
    id: string;
    user_id: string;
    invoice_number: string | null;
    amount: number;
    currency: string;
    customer_id: string;
  }
) {
  try {
    const [{ data: profile }, { data: customer }] = await Promise.all([
      supabase.from("profiles").select("email").eq("id", invoice.user_id).single(),
      supabase.from("customers").select("name").eq("id", invoice.customer_id).single(),
    ]);
    if (!profile) return;

    const appUrl = getAppUrl();
    const invoiceLabel = invoice.invoice_number ? `invoice ${invoice.invoice_number}` : "an invoice";
    const { error: sendError } = await resend.emails.send({
      from: ACCOUNT_FROM_EMAIL,
      to: profile.email,
      subject: `${customer?.name ?? "A client"} says they've paid ${invoiceLabel}`,
      react: PaidClaimNotificationEmail({
        appUrl,
        clientName: customer?.name ?? "A client",
        invoiceLabel,
        amountLabel: formatMoney(Number(invoice.amount), invoice.currency),
        invoiceId: invoice.id,
      }),
    });
    if (sendError) throw new Error(sendError.message);
    await logEmailSend(supabase, { userId: invoice.user_id, kind: "claim_notice" });
  } catch (err) {
    // The claim itself succeeded; a missed notification shouldn't fail the client's click.
    Sentry.captureException(err, { tags: { feature: "paid-claim", stage: "notify-owner" } });
  }
}
