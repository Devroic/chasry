import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { InvoiceStatusBadge } from "@/components/dashboard/invoice-status-badge";
import { formatDate, formatMoney, daysUntil } from "@/lib/format";
import { getUserTimeZone } from "@/lib/timezone";
import { dueStatusLabel } from "@/lib/reminders";
import type { InvoiceStatus } from "@/types/database.types";

/** One invoice as a clickable row/card, showing due-date urgency rather than a raw date. */
export async function InvoiceListItem({
  id,
  customerName,
  invoiceNumber,
  dueDate,
  amount,
  currency,
  status,
}: {
  id: string;
  customerName: string;
  invoiceNumber: string | null;
  dueDate: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
}) {
  const t = await getTranslations("invoices");
  const locale = await getLocale();
  const timeZone = await getUserTimeZone();

  return (
    <Link
      href={`/invoices/${id}`}
      className="flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-muted/50 sm:px-5"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">
          {customerName}
          {invoiceNumber ? ` · ${invoiceNumber}` : ""}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDate(dueDate, locale)}
          {status === "unpaid" ? ` · ${dueStatusLabel(daysUntil(dueDate, timeZone), t)}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-sm font-medium text-foreground">{formatMoney(amount, currency)}</span>
        <InvoiceStatusBadge status={status} dueDate={dueDate} />
      </div>
    </Link>
  );
}
