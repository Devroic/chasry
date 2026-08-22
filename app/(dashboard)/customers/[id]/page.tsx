import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/dashboard/page-header";
import { InvoiceStatusBadge } from "@/components/dashboard/invoice-status-badge";
import { ConfirmDeleteButton } from "@/components/dashboard/confirm-delete-button";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatMoney } from "@/lib/format";
import { deleteCustomer } from "@/app/(dashboard)/customers/actions";

export default async function CustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { supabase, user } = await requireUser();

  // Neither query depends on the other's result — both only need `id` and
  // `user.id`, which are already known — so they run in parallel rather than
  // waiting on the customer fetch before starting the invoices one.
  const [{ data: customer }, { data: invoices }] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, email, phone, notes")
      .eq("id", id)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("invoices")
      .select("id, invoice_number, amount, currency, due_date, status")
      .eq("customer_id", id)
      .eq("user_id", user.id)
      .order("due_date", { ascending: false }),
  ]);

  if (!customer) notFound();

  return (
    <div>
      <PageHeader
        title={customer.name}
        description={customer.email}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/customers/${customer.id}/edit`}>
                <Pencil /> Edit
              </Link>
            </Button>
            <ConfirmDeleteButton
              action={deleteCustomer.bind(null, customer.id)}
              title={`Delete ${customer.name}?`}
              description="This can't be undone. You can only delete a client once they have no invoices."
            />
          </div>
        }
      />

      {error === "has_invoices" && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>
            {customer.name} still has invoices on file. Delete or reassign those first.
          </AlertDescription>
        </Alert>
      )}

      {customer.phone && (
        <p className="mb-6 text-sm text-muted-foreground">Phone: {customer.phone}</p>
      )}
      {customer.notes && (
        <p className="mb-6 max-w-xl text-sm text-muted-foreground">{customer.notes}</p>
      )}

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Invoices</h2>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/invoices/new?customer_id=${customer.id}`}>
            <Plus /> New invoice
          </Link>
        </Button>
      </div>

      {!invoices || invoices.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No invoices for this client yet.
        </p>
      ) : (
        <Card className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    <Link href={`/invoices/${invoice.id}`}>
                      {invoice.invoice_number || "Untitled"}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(invoice.due_date)}
                  </TableCell>
                  <TableCell>{formatMoney(Number(invoice.amount), invoice.currency)}</TableCell>
                  <TableCell>
                    <InvoiceStatusBadge status={invoice.status} dueDate={invoice.due_date} />
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
