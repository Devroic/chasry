import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Pencil, Phone, Link2, Bell, StickyNote } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/dashboard/page-header";
import { BackLink } from "@/components/dashboard/back-link";
import { InvoiceStatusBadge } from "@/components/dashboard/invoice-status-badge";
import { InvoiceListItem } from "@/components/dashboard/invoice-list-item";
import { ClickableTableRow } from "@/components/dashboard/clickable-table-row";
import { ConfirmDeleteButton } from "@/components/dashboard/confirm-delete-button";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { describeReminderSchedule } from "@/lib/reminders";
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
  const [{ data: customer }, { data: invoices }, { data: profile }, { data: settings }] =
    await Promise.all([
      supabase
        .from("customers")
        .select(
          "id, name, email, phone, notes, payment_link, reminder_offsets, reminder_enabled"
        )
        .eq("id", id)
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("invoices")
        .select("id, invoice_number, amount, currency, due_date, status")
        .eq("customer_id", id)
        .eq("user_id", user.id)
        .order("due_date", { ascending: false }),
      supabase.from("profiles").select("payment_link").eq("id", user.id).single(),
      supabase.from("reminder_settings").select("offsets, enabled").eq("user_id", user.id).single(),
    ]);

  if (!customer) notFound();

  const paymentLink = customer.payment_link ?? profile?.payment_link;
  const scheduleOffsets = customer.reminder_offsets ?? settings?.offsets ?? [];
  const scheduleEnabled = customer.reminder_enabled ?? settings?.enabled ?? true;

  const t = await getTranslations("customers");
  const tInvoices = await getTranslations("invoices");
  const tReminderOverride = await getTranslations("reminderOverride");
  const tCommon = await getTranslations("common");
  const locale = await getLocale();

  return (
    <div>
      <BackLink href="/customers" label={t("detail.backLabel")} />
      <PageHeader
        title={customer.name}
        description={customer.email}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/customers/${customer.id}/edit`}>
                <Pencil /> {t("detail.editClient")}
              </Link>
            </Button>
            <ConfirmDeleteButton
              action={deleteCustomer.bind(null, customer.id)}
              title={t("detail.deleteTitle", { name: customer.name })}
              description={t("detail.deleteDescription")}
            />
          </div>
        }
      />

      {error === "has_invoices" && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>
            {t("detail.hasInvoicesError", { name: customer.name })}
          </AlertDescription>
        </Alert>
      )}

      <Card className="mb-6 p-5">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {customer.phone && (
            <div>
              <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                <Phone className="size-3.5" /> {tCommon("phone")}
              </dt>
              <dd className="text-sm text-foreground">{customer.phone}</dd>
            </div>
          )}
          <div>
            <dt className="flex items-center gap-1 text-xs text-muted-foreground">
              <Link2 className="size-3.5" /> {t("columnPaymentLink")}
            </dt>
            <dd className="flex flex-wrap items-center gap-2">
              {paymentLink ? (
                <a
                  href={paymentLink}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-sm text-brand-primary hover:underline"
                >
                  {paymentLink}
                </a>
              ) : (
                <span className="text-sm text-muted-foreground">{t("detail.paymentLinkNone")}</span>
              )}
              <Badge variant="outline" className="text-muted-foreground">
                {customer.payment_link ? t("detail.customForClient") : t("detail.accountDefault")}
              </Badge>
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-1 text-xs text-muted-foreground">
              <Bell className="size-3.5" /> {t("columnSchedule")}
            </dt>
            <dd className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-foreground">
                {describeReminderSchedule(scheduleOffsets, scheduleEnabled, tReminderOverride)}
              </span>
              <Badge variant="outline" className="text-muted-foreground">
                {customer.reminder_offsets != null ? t("detail.customForClient") : t("detail.accountDefault")}
              </Badge>
            </dd>
          </div>
          {customer.notes && (
            <div className="sm:col-span-2">
              <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                <StickyNote className="size-3.5" /> {tCommon("notes")}
              </dt>
              <dd className="text-sm text-foreground">{customer.notes}</dd>
            </div>
          )}
        </dl>
      </Card>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">{t("detail.invoicesTitle")}</h2>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/invoices/new?customer_id=${customer.id}`}>
            <Plus /> {t("detail.newInvoice")}
          </Link>
        </Button>
      </div>

      {!invoices || invoices.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {t("detail.noInvoices")}
        </p>
      ) : (
        <>
          <Card className="p-0 sm:hidden">
            <div className="divide-y divide-border">
              {invoices.map((invoice) => (
                <InvoiceListItem
                  key={invoice.id}
                  id={invoice.id}
                  customerName={customer.name}
                  invoiceNumber={invoice.invoice_number}
                  dueDate={invoice.due_date}
                  amount={Number(invoice.amount)}
                  currency={invoice.currency}
                  status={invoice.status}
                />
              ))}
            </div>
          </Card>

          <Card className="hidden p-0 sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tInvoices("columnInvoiceNumber")}</TableHead>
                  <TableHead>{tInvoices("columnDue")}</TableHead>
                  <TableHead>{tInvoices("columnAmount")}</TableHead>
                  <TableHead>{tInvoices("columnStatus")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <ClickableTableRow key={invoice.id} href={`/invoices/${invoice.id}`}>
                    <TableCell className="font-medium">
                      {invoice.invoice_number || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(invoice.due_date, locale)}
                    </TableCell>
                    <TableCell>{formatMoney(Number(invoice.amount), invoice.currency)}</TableCell>
                    <TableCell>
                      <InvoiceStatusBadge status={invoice.status} dueDate={invoice.due_date} />
                    </TableCell>
                  </ClickableTableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}
