import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { Wallet, CalendarClock, User, Link2, StickyNote, Paperclip } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { BackLink } from "@/components/back-link";
import { InvoiceStatusBadge } from "@/components/dashboard/invoice-status-badge";
import { InvoiceActions } from "@/components/dashboard/invoice-actions";
import { ReminderTimeline } from "@/components/dashboard/reminder-timeline";
import { ReminderPreviewDialog } from "@/components/dashboard/reminder-preview-dialog";
import { SnoozeRemindersButton } from "@/components/dashboard/snooze-reminders-button";
import { PaidClaimBanner } from "@/components/dashboard/paid-claim-banner";
import { buildReminderPreviews } from "@/lib/reminder-preview";
import { isPro } from "@/lib/plan";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatMoney, daysUntil, todayInTimeZone } from "@/lib/format";
import { getUserTimeZone } from "@/lib/timezone";
import { dueStatusLabel } from "@/lib/reminders";

export const metadata = { title: "Invoice" };

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user, profile } = await requireOnboardedUser();

  // One batch; only the customer fetch waits, since it needs the invoice's customer_id.
  const [{ data: invoice }, { data: settings }, { data: logs }] = await Promise.all([
    supabase
      .from("invoices")
      .select(
        "id, invoice_number, amount, currency, due_date, status, notes, customer_id, reminder_offsets, reminder_enabled, snoozed_until, recurring, paid_claimed_at, attachment_filename"
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .single(),
    supabase.from("reminder_settings").select("offsets, enabled").eq("user_id", user.id).single(),
    supabase
      .from("reminder_logs")
      .select("offset_days, status, sent_at")
      .eq("invoice_id", id)
      .eq("user_id", user.id),
  ]);

  if (!invoice) notFound();

  const t = await getTranslations("invoices");
  const tCommon = await getTranslations("common");
  const locale = await getLocale();
  const timeZone = await getUserTimeZone();

  const { data: customer } = await supabase
    .from("customers")
    .select("id, name, email, payment_link, reminder_offsets, reminder_enabled, reminder_locale")
    .eq("id", invoice.customer_id)
    .single();

  // Payment link: 2-level cascade (client → account default), same as the cron job.
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

  // Pre-rendered so the dialog opens instantly, using the same cascade as the cron.
  const showPreview = invoice.status === "unpaid" && effectiveEnabled && effectiveOffsets.length > 0 && customer;
  const previews = showPreview
    ? await buildReminderPreviews({
        offsets: effectiveOffsets,
        businessName: profile.business_name || profile.email,
        invoiceNumber: invoice.invoice_number,
        amount: Number(invoice.amount),
        currency: invoice.currency,
        dueDate: invoice.due_date,
        paymentLink: paymentLink ?? undefined,
        locale: customer.reminder_locale ?? profile.reminder_locale,
        showBranding: !isPro(profile.subscription_status),
      })
    : [];

  return (
    <div className="max-w-2xl">
      <BackLink href="/invoices" label={t("detail.backLabel")} />
      <PageHeader
        title={invoice.invoice_number || t("genericTitle")}
        description={customer ? t("detail.for", { name: customer.name }) : undefined}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {invoice.recurring === "monthly" && (
              <Badge variant="outline" className="border-brand-primary/20 bg-brand-primary-tint text-brand-primary">
                {t("detail.recurringBadge")}
              </Badge>
            )}
            <InvoiceStatusBadge status={invoice.status} dueDate={invoice.due_date} />
            <InvoiceActions invoiceId={invoice.id} status={invoice.status} />
          </div>
        }
      />

      {invoice.paid_claimed_at && invoice.status === "unpaid" && customer && (
        <PaidClaimBanner
          invoiceId={invoice.id}
          clientName={customer.name}
          claimedAtLabel={formatDate(invoice.paid_claimed_at, locale)}
        />
      )}

      <Card className="mb-6">
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
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
                {dueStatusLabel(daysUntil(invoice.due_date, timeZone), t)}
              </p>
            )}
          </div>
          {customer && (
            <div className="col-span-2 sm:col-span-3">
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="size-3.5" /> {t("detail.client")}
              </p>
              <Link
                href={`/clients/${customer.id}`}
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
                      href={`/clients/${customer.id}/edit`}
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
          {invoice.attachment_filename && (
            <div className="col-span-2 sm:col-span-3">
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Paperclip className="size-3.5" /> {t("detail.attachment")}
              </p>
              <a
                href={`/invoices/${invoice.id}/attachment`}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-brand-primary hover:underline"
              >
                {invoice.attachment_filename}
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">{t("detail.reminderSchedule")}</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-muted-foreground">
              {scheduleSource}
            </Badge>
            {previews.length > 0 && (
              <ReminderPreviewDialog
                previews={previews}
                description={t("detail.previewDescription", { name: customer?.name ?? "" })}
                invoiceId={invoice.id}
              />
            )}
          </div>
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
            <>
              {invoice.status === "unpaid" && (
                <div className="mb-4">
                  <SnoozeRemindersButton
                    invoiceId={invoice.id}
                    snoozedUntil={invoice.snoozed_until}
                    snoozedUntilLabel={
                      invoice.snoozed_until ? formatDate(invoice.snoozed_until, locale) : undefined
                    }
                  />
                </div>
              )}
              <ReminderTimeline
                invoiceId={invoice.id}
                dueDate={invoice.due_date}
                offsets={effectiveOffsets}
                logs={logs ?? []}
                invoiceIsPaid={invoice.status !== "unpaid"}
                sendPaused={
                  invoice.paid_claimed_at != null ||
                  (invoice.snoozed_until != null && todayInTimeZone(timeZone) < invoice.snoozed_until)
                }
                timeZone={timeZone}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
