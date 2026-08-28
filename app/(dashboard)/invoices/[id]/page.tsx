import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { Wallet, CalendarClock, User, Link2, StickyNote } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth";
import { PageHeader } from "@/components/dashboard/page-header";
import { BackLink } from "@/components/dashboard/back-link";
import { InvoiceStatusBadge } from "@/components/dashboard/invoice-status-badge";
import { InvoiceActions } from "@/components/dashboard/invoice-actions";
import { ReminderTimeline } from "@/components/dashboard/reminder-timeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatMoney, daysUntil } from "@/lib/format";
import { dueStatusLabel } from "@/lib/reminders";

export const metadata = { title: "Invoice" };

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user, profile } = await requireOnboardedUser();

  // `settings` only depends on user.id (known up front), not on the invoice
  // row, so it can run alongside the invoice fetch instead of after it.
  const [{ data: invoice }, { data: settings }] = await Promise.all([
    supabase
      .from("invoices")
      .select(
        "id, invoice_number, amount, currency, due_date, status, notes, customer_id, reminder_offsets, reminder_enabled"
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .single(),
    supabase.from("reminder_settings").select("offsets, enabled").eq("user_id", user.id).single(),
  ]);

  if (!invoice) notFound();

  const t = await getTranslations("invoices");
  const tCommon = await getTranslations("common");
  const locale = await getLocale();

  const [{ data: customer }, { data: logs }] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, email, payment_link, reminder_offsets, reminder_enabled")
      .eq("id", invoice.customer_id)
      .single(),
    supabase
      .from("reminder_logs")
      .select("offset_days, status, sent_at")
      .eq("invoice_id", invoice.id),
  ]);

  // Payment link is a 2-level cascade (client → account default) — same
  // resolution the cron job uses (app/api/cron/send-reminders/route.ts).
  // Reminder schedule below is still the full 3-level cascade.
  const paymentLink = customer?.payment_link ?? profile.payment_link;
  const paymentLinkSource = customer?.payment_link
    ? t("detail.customForClient", { name: customer.name })
    : t("detail.accountDefault");

  const effectiveEnabled = invoice.reminder_enabled ?? customer?.reminder_enabled ?? settings?.enabled ?? true;
  const effectiveOffsets = invoice.reminder_offsets ?? customer?.reminder_offsets ?? settings?.offsets ?? [];
  const accountDefaultLabel = t("detail.accountDefault");
  const scheduleSource =
    invoice.reminder_offsets != null
      ? t("detail.customForInvoice")
      : customer?.reminder_offsets != null
        ? t("detail.customForClient", { name: customer.name })
        : accountDefaultLabel;

  return (
    <div className="max-w-2xl">
      <BackLink href="/invoices" label={t("detail.backLabel")} />
      <PageHeader
        title={invoice.invoice_number || t("genericTitle")}
        description={customer ? t("detail.for", { name: customer.name }) : undefined}
        action={
          // Top right, matching the client detail page. These used to sit in
          // the middle of the page, so the same actions lived in two different
          // places depending on which record you were looking at.
          <div className="flex flex-wrap items-center gap-2">
            <InvoiceStatusBadge status={invoice.status} dueDate={invoice.due_date} />
            <InvoiceActions invoiceId={invoice.id} status={invoice.status} />
          </div>
        }
      />

      <Card className="mb-6">
        <CardContent className="grid grid-cols-2 gap-4 pt-6 sm:grid-cols-3">
          <div>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Wallet className="size-3.5" /> {t("detail.amount")}
            </p>
            <p className="text-lg font-semibold text-foreground">
              {formatMoney(Number(invoice.amount), invoice.currency)}
            </p>
          </div>
          <div>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarClock className="size-3.5" /> {t("detail.due")}
            </p>
            <p className="text-sm text-foreground">{formatDate(invoice.due_date, locale)}</p>
            {invoice.status === "unpaid" && (
              <p className="text-xs text-muted-foreground">
                {dueStatusLabel(daysUntil(invoice.due_date), t)}
              </p>
            )}
          </div>
          {customer && (
            <div className="col-span-2 sm:col-span-3">
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="size-3.5" /> {t("detail.client")}
              </p>
              <Link
                href={`/customers/${customer.id}`}
                className="text-sm font-medium text-brand-primary hover:underline"
              >
                {customer.name} · {customer.email}
              </Link>
            </div>
          )}
          <div className="col-span-2 sm:col-span-3">
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Link2 className="size-3.5" /> {t("detail.paymentLinkInReminders")}
            </p>
            {paymentLink ? (
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={paymentLink}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-sm text-brand-primary hover:underline"
                >
                  {paymentLink}
                </a>
                {paymentLinkSource && (
                  <Badge variant="outline" className="text-muted-foreground">
                    {paymentLinkSource}
                  </Badge>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("detail.paymentLinkNone")}{" "}
                <Link href="/settings/profile" className="text-brand-primary hover:underline">
                  {t("detail.addDefault")}
                </Link>
                {customer && (
                  <>
                    {" "}
                    {t("detail.or")}{" "}
                    <Link
                      href={`/customers/${customer.id}/edit`}
                      className="text-brand-primary hover:underline"
                    >
                      {t("detail.setForClient")}
                    </Link>
                  </>
                )}
                .
              </p>
            )}
          </div>
          {invoice.notes && (
            <div className="col-span-2 sm:col-span-3">
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <StickyNote className="size-3.5" /> {tCommon("notes")}
              </p>
              <p className="text-sm text-foreground">{invoice.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">{t("detail.reminderSchedule")}</CardTitle>
          <Badge variant="outline" className="text-muted-foreground">
            {scheduleSource}
          </Badge>
        </CardHeader>
        <CardContent>
          {!effectiveEnabled ? (
            <p className="text-sm text-muted-foreground">
              {t("detail.remindersOffTitle")}{" "}
              <Link href={`/invoices/${invoice.id}/edit`} className="text-brand-primary hover:underline">
                {t("detail.editInvoice")}
              </Link>
              {scheduleSource === accountDefaultLabel && (
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
            <ReminderTimeline
              invoiceId={invoice.id}
              dueDate={invoice.due_date}
              offsets={effectiveOffsets}
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
