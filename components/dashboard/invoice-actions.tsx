"use client";

import { useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
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

  return (
    <div className="flex flex-wrap gap-2">
      {status === "unpaid" ? (
        <Button
          size="sm"
          disabled={markPending}
          onClick={() =>
            startMark(async () => {
              await markInvoicePaid(invoiceId);
              toast.success("Marked as paid — reminders stopped.");
            })
          }
        >
          <Check /> Mark as paid
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
                toast.info("Reopened — reminders will resume.");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Couldn't reopen this invoice.");
              }
            })
          }
        >
          <RotateCcw /> Reopen
        </Button>
      ) : null}

      <Button
        size="sm"
        variant="outline"
        disabled={previewPending}
        onClick={() =>
          startPreview(async () => {
            await sendPreviewReminder(invoiceId);
            toast.success("Preview sent to your email.");
          })
        }
      >
        <Send /> {previewPending ? "Sending…" : "Send me a preview"}
      </Button>

      <Button variant="outline" size="sm" asChild>
        <Link href={`/invoices/${invoiceId}/edit`}>
          <Pencil /> Edit
        </Link>
      </Button>

      <ConfirmDeleteButton
        action={deleteInvoice.bind(null, invoiceId)}
        title="Delete this invoice?"
        description="This can't be undone. Reminder history for this invoice will also be removed."
      />
    </div>
  );
}
