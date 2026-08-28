"use client";

import { useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Check, Pencil, RotateCcw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteButton } from "@/components/dashboard/confirm-delete-button";
import {
  markInvoicePaid,
  reopenInvoice,
  deleteInvoice,
  sendPreviewReminder,
} from "@/app/(dashboard)/invoices/actions";
import type { InvoiceStatus } from "@/types/database.types";

export function InvoiceActions({
  invoiceId,
  status,
}: {
  invoiceId: string;
  status: InvoiceStatus;
}) {
  const [markPending, startMark] = useTransition();
  const [previewPending, startPreview] = useTransition();
  const t = useTranslations("invoices.actions");
  const tErrors = useTranslations("invoiceActionErrors");
  const tCommon = useTranslations("common");

  return (
    <div className="flex flex-wrap gap-2">
      {status === "unpaid" ? (
        <Button
          size="sm"
          disabled={markPending}
          onClick={() =>
            startMark(async () => {
              await markInvoicePaid(invoiceId);
              toast.success(t("markPaidToast"));
            })
          }
        >
          <Check /> {t("markPaid")}
        </Button>
      ) : status === "paid" ? (
        <Button
          size="sm"
          variant="outline"
          disabled={markPending}
          onClick={() =>
            startMark(async () => {
              try {
                await reopenInvoice(invoiceId);
                toast.info(t("reopenToast"));
              } catch (err) {
                toast.error(err instanceof Error ? err.message : tErrors("reopenFailed"));
              }
            })
          }
        >
          <RotateCcw /> {t("reopen")}
        </Button>
      ) : null}

      <Button
        size="sm"
        variant="outline"
        disabled={previewPending}
        onClick={() =>
          startPreview(async () => {
            try {
              const { count } = await sendPreviewReminder(invoiceId);
              toast.success(t("sendPreviewToast", { count }));
            } catch (err) {
              toast.error(err instanceof Error ? err.message : tErrors("previewFailed"));
            }
          })
        }
      >
        <Send /> {previewPending ? t("sending") : t("sendPreview")}
      </Button>

      <Button variant="outline" size="sm" asChild>
        <Link href={`/invoices/${invoiceId}/edit`}>
          <Pencil /> {tCommon("edit")}
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
