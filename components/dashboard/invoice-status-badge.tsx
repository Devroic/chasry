import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { daysUntil } from "@/lib/format";
import type { InvoiceStatus } from "@/types/database.types";

export function invoiceDisplayStatus(status: InvoiceStatus, dueDate: string) {
  if (status !== "unpaid") return status;
  return daysUntil(dueDate) < 0 ? "overdue" : "unpaid";
}

export async function InvoiceStatusBadge({
  status,
  dueDate,
}: {
  status: InvoiceStatus;
  dueDate: string;
}) {
  const display = invoiceDisplayStatus(status, dueDate);
  const t = await getTranslations("invoices");

  const styles: Record<string, string> = {
    paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
    overdue: "bg-red-50 text-red-700 border-red-200",
    unpaid: "bg-brand-primary-tint text-brand-primary border-transparent",
    canceled: "bg-muted text-muted-foreground border-transparent",
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
