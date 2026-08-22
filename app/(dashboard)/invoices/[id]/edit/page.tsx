import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { InvoiceForm } from "@/components/dashboard/invoice-form";
import { requireOnboardedUser } from "@/lib/auth";
import { updateInvoice } from "@/app/(dashboard)/invoices/actions";

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user, profile } = await requireOnboardedUser();

  const [{ data: invoice }, { data: customers }] = await Promise.all([
    supabase
      .from("invoices")
      .select(
        "id, customer_id, invoice_number, amount, currency, issued_date, due_date, payment_link, notes"
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("customers")
      .select("id, name")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
  ]);

  if (!invoice) notFound();

  return (
    <div className="max-w-lg">
      <PageHeader title="Edit invoice" />
      <Card className="p-6">
        <Suspense>
          <InvoiceForm
            action={updateInvoice.bind(null, invoice.id)}
            customers={customers ?? []}
            currency={profile.currency}
            defaultValues={invoice}
            defaultPaymentLink={profile.payment_link ?? undefined}
            submitLabel="Save changes"
          />
        </Suspense>
      </Card>
    </div>
  );
}
