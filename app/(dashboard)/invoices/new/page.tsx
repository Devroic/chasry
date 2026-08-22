import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { InvoiceForm } from "@/components/dashboard/invoice-form";
import { UpgradePrompt } from "@/components/dashboard/upgrade-prompt";
import { requireOnboardedUser } from "@/lib/auth";
import { isPro, FREE_INVOICE_LIMIT } from "@/lib/plan";
import { createInvoice } from "@/app/(dashboard)/invoices/actions";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ customer_id?: string }>;
}) {
  const { customer_id } = await searchParams;
  const { supabase, user, profile } = await requireOnboardedUser();

  const [{ data: customers }, { count: activeInvoiceCount }] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "unpaid"),
  ]);

  const atFreeLimit = !isPro(profile.subscription_status) && (activeInvoiceCount ?? 0) >= FREE_INVOICE_LIMIT;

  return (
    <div className="max-w-lg">
      <PageHeader title="Add an invoice" description="Thirty seconds of work." />
      {atFreeLimit ? (
        <UpgradePrompt activeCount={activeInvoiceCount ?? FREE_INVOICE_LIMIT} />
      ) : (
        <Card className="p-6">
          <Suspense>
            <InvoiceForm
              action={createInvoice}
              customers={customers ?? []}
              currency={profile.currency}
              defaultCustomerId={customer_id}
            />
          </Suspense>
        </Card>
      )}
    </div>
  );
}
