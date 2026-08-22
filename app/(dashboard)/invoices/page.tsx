import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { InvoiceStatusBadge, invoiceDisplayStatus } from "@/components/dashboard/invoice-status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatMoney } from "@/lib/format";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "unpaid", label: "Unpaid" },
  { key: "overdue", label: "Overdue" },
  { key: "paid", label: "Paid" },
] as const;

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter = "all" } = await searchParams;
  const { supabase, user } = await requireUser();

  const { data: invoicesRaw } = await supabase
    .from("invoices")
    .select("id, invoice_number, amount, currency, due_date, status, customer_id")
    .eq("user_id", user.id)
    .order("due_date", { ascending: true });

  const invoices = invoicesRaw ?? [];
  const customerIds = [...new Set(invoices.map((i) => i.customer_id))];
  const { data: customers } = customerIds.length
    ? await supabase.from("customers").select("id, name").in("id", customerIds)
    : { data: [] };
  const customerName = new Map((customers ?? []).map((c) => [c.id, c.name]));

  const filtered = invoices.filter((invoice) => {
    const display = invoiceDisplayStatus(invoice.status, invoice.due_date);
    if (filter === "all") return true;
    if (filter === "unpaid") return invoice.status === "unpaid";
    return display === filter;
  });

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="Every invoice you're tracking, and what Chasry is doing about it."
        action={
          <Button asChild>
            <Link href="/invoices/new">
              <Plus /> Add invoice
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex gap-1 border-b border-border">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/invoices" : `/invoices?filter=${f.key}`}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium",
              filter === f.key
                ? "border-brand-primary text-brand-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {invoices.length === 0 ? (
        <EmptyState
          title="No invoices yet"
          description="Log an unpaid invoice and Chasry will start sending reminders automatically."
          actionLabel="Add your first invoice"
          actionHref="/invoices/new"
        />
      ) : filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nothing in this view.
        </p>
      ) : (
        <Card className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    <Link href={`/invoices/${invoice.id}`} className="block">
                      {customerName.get(invoice.customer_id) ?? "Client"}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <Link href={`/invoices/${invoice.id}`} className="block">
                      {invoice.invoice_number || "—"}
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
