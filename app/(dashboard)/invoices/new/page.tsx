import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { BackLink } from "@/components/dashboard/back-link";
import { FormTips } from "@/components/dashboard/form-tips";
import { InvoiceForm } from "@/components/dashboard/invoice-form";
import { UpgradePrompt } from "@/components/dashboard/upgrade-prompt";
import { requireOnboardedUser } from "@/lib/auth";
import { isPro, FREE_INVOICE_LIMIT } from "@/lib/plan";
import { suggestNextInvoiceNumber } from "@/lib/invoice-number";
import { createInvoice } from "@/app/(dashboard)/invoices/actions";

export const metadata = { title: "New invoice" };

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ customer_id?: string }>;
}) {
  const { customer_id } = await searchParams;
  const { supabase, user, profile } = await requireOnboardedUser();

  const [{ data: customers }, { count: activeInvoiceCount }, { data: lastInvoice }, { data: reminderSettings }] =
    await Promise.all([
      supabase
        .from("customers")
        .select("id, name, payment_link, reminder_offsets, reminder_enabled")
        .eq("user_id", user.id)
        .order("name", { ascending: true }),
      supabase
        .from("invoices")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "unpaid"),
      supabase
        .from("invoices")
        .select("invoice_number")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("reminder_settings").select("offsets, enabled").eq("user_id", user.id).single(),
    ]);

  const atFreeLimit = !isPro(profile.subscription_status) && (activeInvoiceCount ?? 0) >= FREE_INVOICE_LIMIT;
  const t = await getTranslations("invoices");
  const tCommon = await getTranslations("common");

  return (
    <div className="max-w-4xl">
      <BackLink
        href={customer_id ? `/customers/${customer_id}` : "/invoices"}
        label={customer_id ? tCommon("back") : t("listTitle")}
      />
      <PageHeader title={t("new.title")} description={t("new.subtitle")} />
      {atFreeLimit ? (
        <UpgradePrompt activeCount={activeInvoiceCount ?? FREE_INVOICE_LIMIT} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-6 lg:col-span-2">
            <Suspense>
              <InvoiceForm
                action={createInvoice}
                customers={customers ?? []}
                currency={profile.currency}
                defaultCustomerId={customer_id}
                lockCustomer={!!customer_id}
                lockReason="preselected"
                suggestedInvoiceNumber={suggestNextInvoiceNumber(lastInvoice?.invoice_number)}
                defaultPaymentLink={profile.payment_link ?? undefined}
                accountDefaults={{
                  offsets: reminderSettings?.offsets ?? [],
                  enabled: reminderSettings?.enabled ?? true,
                }}
                isPro={isPro(profile.subscription_status)}
                cancelHref={customer_id ? `/customers/${customer_id}` : "/invoices"}
              />
            </Suspense>
          </Card>
          <FormTips
            title={t("new.tipsTitle")}
            tips={[t("new.tip1"), t("new.tip2"), t("new.tip3")]}
          />
        </div>
      )}
    </div>
  );
}
