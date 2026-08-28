import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { BackLink } from "@/components/dashboard/back-link";
import { FormTips } from "@/components/dashboard/form-tips";
import { CustomerForm } from "@/components/dashboard/customer-form";
import { requireUser } from "@/lib/auth";
import { createCustomer } from "@/app/(dashboard)/customers/actions";

export const metadata = { title: "New client" };

export default async function NewCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string }>;
}) {
  const { return_to } = await searchParams;
  const { supabase, user } = await requireUser();
  const t = await getTranslations("customers");
  const tCommon = await getTranslations("common");

  const { data: reminderSettings } = await supabase
    .from("reminder_settings")
    .select("offsets, enabled")
    .eq("user_id", user.id)
    .single();

  return (
    <div className="max-w-4xl">
      <BackLink
        href={return_to || "/customers"}
        label={return_to ? tCommon("back") : t("listTitle")}
      />
      <PageHeader title={t("new.title")} description={t("new.subtitle")} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <CustomerForm
            action={createCustomer}
            returnTo={return_to}
            accountDefaults={{
              offsets: reminderSettings?.offsets ?? [],
              enabled: reminderSettings?.enabled ?? true,
            }}
          />
        </Card>
        <FormTips
          title={t("new.tipsTitle")}
          tips={[t("new.tip1"), t("new.tip2"), t("new.tip3")]}
        />
      </div>
    </div>
  );
}
