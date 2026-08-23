import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { BackLink } from "@/components/dashboard/back-link";
import { FormTips } from "@/components/dashboard/form-tips";
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

  const [{ data: invoice }, { data: customers }, { data: reminderSettings }] = await Promise.all([
    supabase
      .from("invoices")
      .select(
        "id, customer_id, invoice_number, amount, currency, due_date, notes, reminder_offsets, reminder_enabled"
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("customers")
      .select("id, name, payment_link, reminder_offsets, reminder_enabled")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
    supabase.from("reminder_settings").select("offsets, enabled").eq("user_id", user.id).single(),
  ]);

  if (!invoice) notFound();

  const t = await getTranslations("invoices");
  const tCommon = await getTranslations("common");

  return (
    <div className="max-w-4xl">
      <BackLink href={`/invoices/${invoice.id}`} label={invoice.invoice_number || t("genericTitle")} />
      <PageHeader title={t("editPage.title")} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <Suspense>
            <InvoiceForm
              action={updateInvoice.bind(null, invoice.id)}
              customers={customers ?? []}
              currency={profile.currency}
              defaultValues={invoice}
              defaultPaymentLink={profile.payment_link ?? undefined}
              accountDefaults={{
                offsets: reminderSettings?.offsets ?? [],
                enabled: reminderSettings?.enabled ?? true,
              }}
              submitLabel={tCommon("saveChanges")}
            />
          </Suspense>
        </Card>
        <FormTips
          title={t("editPage.tipsTitle")}
          tips={[t("editPage.tip1"), t("editPage.tip2")]}
        />
      </div>
    </div>
  );
}
