import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { CustomerForm } from "@/components/dashboard/customer-form";
import { createCustomer } from "@/app/(dashboard)/customers/actions";

export default async function NewCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string }>;
}) {
  const { return_to } = await searchParams;

  return (
    <div className="max-w-lg">
      <PageHeader title="Add a client" description="Just their name and email to start." />
      <Card className="p-6">
        <CustomerForm action={createCustomer} returnTo={return_to} />
      </Card>
    </div>
  );
}
