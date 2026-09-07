import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Pencil, Phone, Link2, Bell, StickyNote, Languages, History } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { overrideBadgeClass } from "@/lib/override-badge";
import { withReturnTo } from "@/lib/return-to";
import { PageHeader } from "@/components/page-header";
import { BackLink } from "@/components/back-link";
import { InvoiceStatusBadge } from "@/components/dashboard/invoice-status-badge";
import { InvoiceListItem } from "@/components/dashboard/invoice-list-item";
import { ClickableTableRow } from "@/components/clickable-table-row";
import { ConfirmDeleteButton } from "@/components/dashboard/confirm-delete-button";
import { EmptyMessage } from "@/components/empty-message";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { deleteCustomer } from "@/app/(dashboard)/clients/actions";

export const metadata = { title: "Client" };

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

  const [{ data: customer }, { data: invoices }, { data: profile }, { data: settings }] =
    await Promise.all([
      supabase
        .from("customers")
        .select(
          "id, name, email, phone, notes, payment_link, reminder_offsets, reminder_enabled, reminder_locale"
        )
        .eq("id", id)
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("invoices")
        .select("id, invoice_number, amount, currency, due_date, status, paid_at")
        .eq("customer_id", id)
        .eq("user_id", user.id)
        .order("due_date", { ascending: false }),
      supabase.from("profiles").select("payment_link, reminder_locale").eq("id", user.id).single(),
      supabase.from("reminder_settings").select("offsets, enabled").eq("user_id", user.id).single(),
    ]);

  if (!customer) notFound();

  const paymentLink = customer.payment_link ?? profile?.payment_link;
  const scheduleOffsets = customer.reminder_offsets ?? settings?.offsets ?? [];
  const scheduleEnabled = customer.reminder_enabled ?? settings?.enabled ?? true;
  const reminderLocale = customer.reminder_locale ?? profile?.reminder_locale ?? "en";
  // Account-default rows offer a jump to Settings that comes back here afterwards.
  const settingsHref = withReturnTo("/settings/reminders", `/clients/${customer.id}`);

  const t = await getTranslations("customers");
  const tInvoices = await getTranslations("invoices");
  const tReminderOverride = await getTranslations("reminderOverride");
  const tCommon = await getTranslations("common");
  const locale = await getLocale();

  const scheduleSourceIsAccountDefault = customer.reminder_offsets == null;

  // Payment habits: avg of (paid_at - due_date) days across paid invoices; positive = pays late.
  const paidDeltas = (invoices ?? [])
    .filter((i) => i.status === "paid" && i.paid_at)
    .map((i) => {
      const paidDayMs = new Date(i.paid_at as string).setUTCHours(0, 0, 0, 0);
      const dueDayMs = new Date(`${i.due_date}T00:00:00Z`).getTime();
      return Math.round((paidDayMs - dueDayMs) / 86_400_000);
    });
  const avgPaymentDelta = paidDeltas.length
    ? Math.round(paidDeltas.reduce((sum, d) => sum + d, 0) / paidDeltas.length)
    : null;

  return (
    <div className="max-w-2xl">
      <BackLink href="/clients" label={t("detail.backLabel")} />
      <PageHeader
        title={customer.name}
        description={customer.email}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/clients/${customer.id}/edit`}>
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

      <Card className="mb-6">
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {customer.phone && (
            <div>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Phone className="size-3.5" /> {tCommon("phone")}
              </p>
              <a
                href={`tel:${customer.phone.replace(/[^0-9+]/g, "")}`}
                className="text-sm text-foreground underline-offset-4 hover:underline"
              >
                {customer.phone}
              </a>
            </div>
          )}
          <div className="col-span-2 sm:col-span-3">
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Link2 className="size-3.5" /> {t("detail.paymentLinkInReminders")}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {paymentLink ? (
                <>
                  <a
                    href={paymentLink}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-sm text-brand-primary hover:underline"
                  >
                    {paymentLink}
                  </a>
                  <Badge variant="outline" className={overrideBadgeClass(!!customer.payment_link)}>
                    {customer.payment_link ? t("detail.customForClient") : t("detail.accountDefault")}
                  </Badge>
                </>
              ) : (
                // Nothing set on the client or the account: no "default" is being applied, so no badge.
                <span className="text-sm text-muted-foreground">{t("detail.paymentLinkNone")}</span>
              )}
            </div>
            {!customer.payment_link && (
              <p className="text-sm">
                <Link href={settingsHref} className="text-brand-primary hover:underline">
                  {paymentLink ? t("detail.changeDefault") : t("detail.addDefault")}
                </Link>
              </p>
            )}
          </div>
          <div className="col-span-2 sm:col-span-3">
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Languages className="size-3.5" /> {t("detail.reminderLocale")}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-foreground">{tCommon(`localeNames.${reminderLocale}`)}</span>
              <Badge variant="outline" className={overrideBadgeClass(!!customer.reminder_locale)}>
                {customer.reminder_locale ? t("detail.customForClient") : t("detail.accountDefault")}
              </Badge>
            </div>
            {!customer.reminder_locale && (
              <p className="text-sm">
                <Link href={settingsHref} className="text-brand-primary hover:underline">
                  {t("detail.changeDefault")}
                </Link>
              </p>
            )}
          </div>
          {avgPaymentDelta != null && (
            <div className="col-span-2 sm:col-span-3">
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <History className="size-3.5" /> {t("detail.paymentHabits")}
              </p>
              <p className="text-sm text-foreground">
                {avgPaymentDelta > 0
                  ? t("detail.paysLate", { days: avgPaymentDelta })
                  : avgPaymentDelta < 0
                    ? t("detail.paysEarly", { days: Math.abs(avgPaymentDelta) })
                    : t("detail.paysOnTime")}{" "}
                <span className="text-xs text-muted-foreground">
                  {t("detail.paymentHabitsBasis", { count: paidDeltas.length })}
                </span>
              </p>
            </div>
          )}
          {customer.notes && (
            <div className="col-span-2 sm:col-span-3">
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <StickyNote className="size-3.5" /> {tCommon("notes")}
              </p>
              <p className="text-sm text-foreground">{customer.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">{t("detail.reminderSchedule")}</CardTitle>
          <Badge variant="outline" className={overrideBadgeClass(customer.reminder_offsets != null)}>
            {customer.reminder_offsets != null ? t("detail.customForClient") : t("detail.accountDefault")}
          </Badge>
        </CardHeader>
        <CardContent>
          {!scheduleEnabled ? (
            <p className="text-sm text-muted-foreground">
              {t("detail.remindersOffTitle")}{" "}
              <Link href={`/clients/${customer.id}/edit`} className="text-brand-primary hover:underline">
                {t("detail.editClientLink")}
              </Link>
              {scheduleSourceIsAccountDefault && (
                <>
                  {" "}
                  {t("detail.orAccountSettings")}{" "}
                  <Link href="/settings/reminders" className="text-brand-primary hover:underline">
                    {t("detail.accountSettings")}
                  </Link>
                </>
              )}
              .
            </p>
          ) : (
            <p className="flex items-center gap-1 text-sm text-foreground">
              <Bell className="size-3.5 shrink-0 text-muted-foreground" />
              {describeReminderSchedule(scheduleOffsets, scheduleEnabled, tReminderOverride)}
            </p>
          )}
        </CardContent>
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
        <EmptyMessage>{t("detail.noInvoices")}</EmptyMessage>
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
                  <ClickableTableRow
                    key={invoice.id}
                    href={`/invoices/${invoice.id}`}
                    label={invoice.invoice_number || formatDate(invoice.due_date, locale)}
                  >
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
