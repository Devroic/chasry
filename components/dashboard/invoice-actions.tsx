"use client";

import { useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Check, Copy, Pencil, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BlockingOverlay } from "@/components/blocking-overlay";
import { ConfirmDeleteButton } from "@/components/dashboard/confirm-delete-button";
import { markInvoicePaid, reopenInvoice, deleteInvoice } from "@/app/(dashboard)/invoices/actions";
import type { InvoiceStatus } from "@/types/database.types";

export function InvoiceActions({
  invoiceId,
  status,
}: {
  invoiceId: string;
  status: InvoiceStatus;
}) {
  const [markPending, startMark] = useTransition();
  const t = useTranslations("invoices.actions");
  const tErrors = useTranslations("invoiceActionErrors");
  const tCommon = useTranslations("common");

  return (
    <div className="flex flex-wrap gap-2">
      <BlockingOverlay show={markPending} spinner={false} />
      {status === "unpaid" ? (
        <Button
          size="sm"
          loading={markPending}
          onClick={() =>
            startMark(async () => {
              const result = await markInvoicePaid(invoiceId);
              if (result?.error) toast.error(result.error);
              else toast.success(t("markPaidToast"));
            })
          }
        >
          <Check /> {t("markPaid")}
        </Button>
      ) : status === "paid" ? (
        <Button
          size="sm"
          variant="outline"
          loading={markPending}
          onClick={() =>
            startMark(async () => {
              const result = await reopenInvoice(invoiceId).catch(() => ({ error: tErrors("reopenFailed") }));
              if (result?.error) toast.error(result.error);
              else toast.info(t("reopenToast"));
            })
          }
        >
          <RotateCcw /> {t("reopen")}
        </Button>
      ) : null}

      <Button variant="outline" size="sm" asChild>
        <Link href={`/invoices/${invoiceId}/edit`}>
          <Pencil /> {tCommon("edit")}
        </Link>
      </Button>

      <Button variant="outline" size="sm" asChild>
        <Link href={`/invoices/new?from=${invoiceId}`}>
          <Copy /> {t("duplicate")}
        </Link>
      </Button>

      <ConfirmDeleteButton
        action={deleteInvoice.bind(null, invoiceId)}
        title={t("deleteTitle")}
        description={t("deleteDescription")}
      />
    </div>
  );
}
