import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/dashboard/page-header";
import { InvoiceStatusBadge } from "@/components/dashboard/invoice-status-badge";
import { InvoiceActions } from "@/components/dashboard/invoice-actions";
import { ReminderTimeline } from "@/components/dashboard/reminder-timeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatMoney } from "@/lib/format";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user } = await requireUser();

  const { data: invoice } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, amount, currency, issued_date, due_date, status, notes, customer_id"
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!invoice) notFound();

  const [{ data: customer }, { data: settings }, { data: logs }] = await Promise.all([
    supabase.from("customers").select("id, name, email").eq("id", invoice.customer_id).single(),
    supabase.from("reminder_settings").select("offsets, enabled").eq("user_id", user.id).single(),
    supabase
      .from("reminder_logs")
      .select("offset_days, status, sent_at")
      .eq("invoice_id", invoice.id),
  ]);

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={invoice.invoice_number || "Invoice"}
        description={customer ? `For ${customer.name}` : undefined}
        action={<InvoiceStatusBadge status={invoice.status} dueDate={invoice.due_date} />}
      />

      <Card className="mb-6">
        <CardContent className="grid grid-cols-2 gap-4 pt-6 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Amount</p>
            <p className="text-lg font-semibold text-foreground">
              {formatMoney(Number(invoice.amount), invoice.currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Issued</p>
            <p className="text-sm text-foreground">{formatDate(invoice.issued_date)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Due</p>
            <p className="text-sm text-foreground">{formatDate(invoice.due_date)}</p>
          </div>
          {customer && (
            <div className="col-span-2 sm:col-span-3">
              <p className="text-xs text-muted-foreground">Client</p>
              <Link
                href={`/customers/${customer.id}`}
                className="text-sm font-medium text-brand-primary hover:underline"
              >
                {customer.name} · {customer.email}
              </Link>
            </div>
          )}
          {invoice.notes && (
            <div className="col-span-2 sm:col-span-3">
              <p className="text-xs text-muted-foreground">Notes</p>
              <p className="text-sm text-foreground">{invoice.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mb-6">
        <InvoiceActions invoiceId={invoice.id} status={invoice.status} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reminder schedule</CardTitle>
        </CardHeader>
        <CardContent>
          {settings?.enabled === false ? (
            <p className="text-sm text-muted-foreground">
              Reminders are turned off in{" "}
              <Link href="/settings/reminders" className="text-brand-primary hover:underline">
                settings
              </Link>
              .
            </p>
          ) : (
            <ReminderTimeline
              dueDate={invoice.due_date}
              offsets={settings?.offsets ?? []}
              logs={logs ?? []}
              invoiceIsPaid={invoice.status !== "unpaid"}
              // eslint-disable-next-line react-hooks/purity -- Server Component: renders once per request, not subject to client re-render instability.
              now={Date.now()}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
