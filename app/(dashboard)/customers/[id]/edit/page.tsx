import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { CustomerForm } from "@/components/dashboard/customer-form";
import { requireUser } from "@/lib/auth";
import { updateCustomer } from "@/app/(dashboard)/customers/actions";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user } = await requireUser();

  const { data: customer } = await supabase
    .from("customers")
    .select("id, name, email, phone, notes")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!customer) notFound();

  return (
    <div className="max-w-lg">
      <PageHeader title="Edit client" />
      <Card className="p-6">
        <CustomerForm
          action={updateCustomer.bind(null, customer.id)}
          defaultValues={customer}
          submitLabel="Save changes"
        />
      </Card>
    </div>
  );
}
