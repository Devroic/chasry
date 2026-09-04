import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { STATUS_TONES } from "@/components/status-tones";
import { daysUntil } from "@/lib/format";
import { getUserTimeZone } from "@/lib/timezone";
import type { InvoiceStatus } from "@/types/database.types";

export function invoiceDisplayStatus(status: InvoiceStatus, dueDate: string, timeZone = "UTC") {
  if (status !== "unpaid") return status;
  return daysUntil(dueDate, timeZone) < 0 ? "overdue" : "unpaid";
}

export async function InvoiceStatusBadge({
  status,
  dueDate,
}: {
  status: InvoiceStatus;
  dueDate: string;
}) {
  // "Overdue" follows the viewer's own calendar day, not UTC's.
  const timeZone = await getUserTimeZone();
  const display = invoiceDisplayStatus(status, dueDate, timeZone);
  const t = await getTranslations("invoices");

  const styles: Record<string, string> = {
    paid: STATUS_TONES.positive,
    overdue: STATUS_TONES.negative,
    unpaid: STATUS_TONES.brand,
    canceled: STATUS_TONES.neutral,
  };

  const labels: Record<string, string> = {
    paid: t("statusPaid"),
    overdue: t("statusOverdue"),
    unpaid: t("statusUnpaid"),
    canceled: t("statusCanceled"),
  };

  return (
    <Badge variant="outline" className={styles[display]}>
      {labels[display]}
    </Badge>
  );
}
