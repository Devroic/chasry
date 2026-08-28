"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { removeInvoiceAttachment } from "@/app/(dashboard)/invoices/actions";

// Pro-gated PDF attachment picker. Not wired into react-hook-form — a file input
// can't be pre-filled, so "already attached" vs "newly selected" is owned here directly.
export function InvoiceAttachmentField({
  isPro,
  invoiceId,
  currentFilename,
  selectedFile,
  onFileChange,
}: {
  isPro: boolean;
  /** Only set when editing an existing invoice — enables the "Remove" action. */
  invoiceId?: string;
  /** The filename already saved on the invoice, if any. */
  currentFilename: string | null;
  /** The newly-chosen file, not yet saved. */
  selectedFile: File | null;
  onFileChange: (file: File | null) => void;
}) {
  const t = useTranslations("invoices.form");
  const tCommon = useTranslations("common");
  const [removed, setRemoved] = useState(false);
  const [pending, startTransition] = useTransition();

  const hasSavedFile = !!currentFilename && !removed;

  // Pro gate only blocks *adding* a file — a Free user who already has one can still remove it.
  if (!isPro && !hasSavedFile && !selectedFile) {
    return (
      <p className="rounded-lg border border-border bg-brand-primary-tint p-3 text-xs text-muted-foreground">
        {t("attachmentProOnly")}{" "}
        <Link href="/settings/billing" className="text-brand-primary hover:underline">
          {t("attachmentUpgrade")}
        </Link>
      </p>
    );
  }

  if (selectedFile) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
        <span className="flex min-w-0 items-center gap-1.5 truncate text-foreground">
          <Paperclip className="size-3.5 shrink-0" />
          <span className="truncate">{selectedFile.name}</span>
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onFileChange(null)}
          aria-label={tCommon("cancel")}
        >
          <X className="size-3.5" />
        </Button>
      </div>
    );
  }

  if (hasSavedFile) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
        <span className="flex min-w-0 items-center gap-1.5 truncate text-foreground">
          <Paperclip className="size-3.5 shrink-0" />
          <span className="truncate">{currentFilename}</span>
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              if (!invoiceId) return;
              await removeInvoiceAttachment(invoiceId);
              setRemoved(true);
              toast.success(t("attachmentRemovedToast"));
            })
          }
        >
          {pending ? tCommon("saving") : t("attachmentRemove")}
        </Button>
      </div>
    );
  }

  return (
    <input
      type="file"
      accept="application/pdf"
      onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
      className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-brand-primary-tint file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-primary hover:file:bg-brand-secondary-tint"
    />
  );
}
