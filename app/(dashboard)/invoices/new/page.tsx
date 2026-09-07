import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { BackLink } from "@/components/back-link";
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
  searchParams: Promise<{ customer_id?: string; from?: string }>;
}) {
  const { customer_id, from } = await searchParams;
  const { supabase, user, profile } = await requireOnboardedUser();

  const [
    { data: customers },
    { count: activeInvoiceCount },
    { data: lastInvoice },
    { data: reminderSettings },
    { data: sourceInvoice },
  ] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, payment_link, reminder_offsets, reminder_enabled, reminder_locale")
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
    // Duplicate flow, user-scoped so a foreign id just yields a blank form.
    from
      ? supabase
          .from("invoices")
          .select("id, customer_id, invoice_number, amount, currency, notes")
          .eq("id", from)
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const atFreeLimit = !isPro(profile.subscription_status) && (activeInvoiceCount ?? 0) >= FREE_INVOICE_LIMIT;
  const t = await getTranslations("invoices");
  const tCommon = await getTranslations("common");

  // Copies only what repeat billing reuses. due_date stays empty so the form fills in the user's
  // local today; a server-side UTC date showed yesterday near midnight east of UTC.
  const duplicateDefaults = sourceInvoice
    ? {
        customer_id: sourceInvoice.customer_id,
        invoice_number: null,
        amount: Number(sourceInvoice.amount),
        due_date: "",
        notes: sourceInvoice.notes,
        reminder_offsets: null,
        reminder_enabled: null,
      }
    : undefined;

  return (
    <div className="max-w-4xl">
      <BackLink
        href={sourceInvoice ? `/invoices/${sourceInvoice.id}` : customer_id ? `/clients/${customer_id}` : "/invoices"}
        label={sourceInvoice || customer_id ? tCommon("back") : t("listTitle")}
      />
      <PageHeader
        title={t("new.title")}
        description={
          sourceInvoice
            ? sourceInvoice.invoice_number
              ? t("new.duplicatedFrom", { number: sourceInvoice.invoice_number })
              : t("new.duplicatedFromGeneric")
            : t("new.subtitle")
        }
      />
      {atFreeLimit ? (
        <UpgradePrompt activeCount={activeInvoiceCount ?? FREE_INVOICE_LIMIT} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-6 lg:col-span-2">
            <Suspense>
              <InvoiceForm
                action={createInvoice}
                customers={customers ?? []}
                currency={sourceInvoice?.currency ?? profile.currency}
                defaultValues={duplicateDefaults}
                defaultCustomerId={customer_id}
                lockCustomer={!!customer_id}
                lockReason="preselected"
                suggestedInvoiceNumber={suggestNextInvoiceNumber(lastInvoice?.invoice_number)}
                defaultPaymentLink={profile.payment_link ?? undefined}
                accountDefaults={{
                  offsets: reminderSettings?.offsets ?? [],
                  enabled: reminderSettings?.enabled ?? true,
                  locale: profile.reminder_locale,
                }}
                isPro={isPro(profile.subscription_status)}
                cancelHref={
                  sourceInvoice
                    ? `/invoices/${sourceInvoice.id}`
                    : customer_id
                      ? `/clients/${customer_id}`
                      : "/invoices"
                }
              />
            </Suspense>
          </Card>
          <FormTips
            title={t("new.tipsTitle")}
            tips={[t("new.tip1"), t("new.tip2")]}
          />
        </div>
      )}
    </div>
  );
}
