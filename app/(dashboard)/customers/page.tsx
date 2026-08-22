import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function CustomersPage() {
  const { supabase, user } = await requireUser();

  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, email, phone, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader
        title="Clients"
        description="The people and businesses you invoice."
        action={
          <Button asChild>
            <Link href="/customers/new">
              <Plus /> Add client
            </Link>
          </Button>
        }
      />

      {!customers || customers.length === 0 ? (
        <EmptyState
          title="No clients yet"
          description="Add a client so you can start logging invoices for them."
          actionLabel="Add your first client"
          actionHref="/customers/new"
        />
      ) : (
        <Card className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="hidden sm:table-cell">Phone</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id} className="cursor-pointer">
                  <TableCell className="font-medium">
                    <Link href={`/customers/${customer.id}`} className="block">
                      {customer.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <Link href={`/customers/${customer.id}`} className="block">
                      {customer.email}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    <Link href={`/customers/${customer.id}`} className="block">
                      {customer.phone || "—"}
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
