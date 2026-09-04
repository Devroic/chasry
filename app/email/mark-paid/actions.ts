"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyInvoiceLink } from "@/lib/link-token";
import { checkAuthRateLimit } from "@/lib/rate-limit";

/**
 * Public action behind the weekly digest's "mark as paid" links. The signed token scopes it to
 * one invoice and one operation; idempotent, and reachable only via an explicit confirm POST.
 */
export async function confirmMarkPaidFromEmail(token: string) {
  const invoiceId = verifyInvoiceLink("mark-paid", token);
  if (!invoiceId) return;

  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { success } = await checkAuthRateLimit(`mark-paid:${ip}`);
  if (!success) return;

  const supabase = createAdminClient();
  await supabase
    .from("invoices")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", invoiceId)
    .eq("status", "unpaid");

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  revalidatePath("/dashboard");

  redirect(`/email/mark-paid?token=${encodeURIComponent(token)}`);
}
