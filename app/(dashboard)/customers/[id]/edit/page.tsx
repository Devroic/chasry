import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { BackLink } from "@/components/dashboard/back-link";
import { FormTips } from "@/components/dashboard/form-tips";
import { CustomerForm } from "@/components/dashboard/customer-form";
import { requireUser } from "@/lib/auth";
import { updateCustomer } from "@/app/(dashboard)/customers/actions";

export const metadata = { title: "Edit client" };

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user } = await requireUser();

  const [{ data: customer }, { data: reminderSettings }] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, email, phone, notes, payment_link, reminder_offsets, reminder_enabled")
      .eq("id", id)
      .eq("user_id", user.id)
      .single(),
    supabase.from("reminder_settings").select("offsets, enabled").eq("user_id", user.id).single(),
  ]);

  if (!customer) notFound();

  const t = await getTranslations("customers");
  const tCommon = await getTranslations("common");

  return (
    <div className="max-w-4xl">
      <BackLink href={`/customers/${customer.id}`} label={customer.name} />
      <PageHeader title={t("editPage.title")} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <CustomerForm
            action={updateCustomer.bind(null, customer.id)}
            defaultValues={customer}
            accountDefaults={{
              offsets: reminderSettings?.offsets ?? [],
              enabled: reminderSettings?.enabled ?? true,
            }}
            cancelHref={`/customers/${customer.id}`}
            submitLabel={tCommon("saveChanges")}
          />
        </Card>
        <FormTips
          title={t("editPage.tipsTitle")}
          tips={[t("editPage.tip1"), t("editPage.tip2")]}
        />
      </div>
    </div>
  );
}
