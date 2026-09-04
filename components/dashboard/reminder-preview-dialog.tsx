"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Eye, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { sendPreviewReminder } from "@/app/(dashboard)/invoices/actions";
import { cn } from "@/lib/utils";
import type { ReminderPreview } from "@/lib/reminder-preview";

/**
 * Shows the reminder emails a schedule will send, one tab per tone. The HTML is pre-rendered by
 * buildReminderPreviews() and shown in a sandboxed iframe, so it is pixel-true and scriptless.
 */
export function ReminderPreviewDialog({
  previews,
  description,
  invoiceId,
}: {
  previews: ReminderPreview[];
  /** Context line under the title, e.g. "exactly what this client receives". */
  description: string;
  /** When set, offers "Email these to me". Omitted for the settings sample. */
  invoiceId?: string;
}) {
  const t = useTranslations("reminderPreview");
  const tActions = useTranslations("invoices.actions");
  const tErrors = useTranslations("invoiceActionErrors");
  const [open, setOpen] = useState(false);
  const [selectedTone, setSelectedTone] = useState(previews[0]?.tone);
  const [sendPending, startSend] = useTransition();
  const selected = previews.find((p) => p.tone === selectedTone) ?? previews[0];

  if (!selected) return null;

  return (
    // While sending, the dialog can't be dismissed (Esc, overlay, X).
    <Dialog open={open} onOpenChange={(next) => !sendPending && setOpen(next)}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye /> {t("button")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl" showCloseButton={!sendPending}>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {previews.length > 1 && (
          <div className="flex flex-wrap gap-1 rounded-lg border border-border p-1 self-start">
            {previews.map((preview) => (
              <button
                key={preview.tone}
                type="button"
                aria-pressed={preview.tone === selected.tone}
                onClick={() => setSelectedTone(preview.tone)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  preview.tone === selected.tone
                    ? "bg-brand-primary-tint text-brand-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {preview.toneLabel}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-1 text-sm">
          <p className="text-foreground">
            <span className="text-muted-foreground">{t("subjectLabel")}: </span>
            <span className="font-medium">{selected.subject}</span>
          </p>
          <p className="text-xs text-muted-foreground">{selected.sentLabel}</p>
        </div>

        {/* Frame stays white in dark mode on purpose: that's what the inbox shows. */}
        <iframe
          sandbox=""
          srcDoc={selected.html}
          title={selected.subject}
          className="h-96 w-full rounded-lg border border-border bg-white"
        />

        {invoiceId && (
          <DialogFooter className="sm:justify-between sm:gap-4">
            <p className="self-center text-xs text-muted-foreground">{t("emailMeHint")}</p>
            <Button
              variant="outline"
              disabled={sendPending}
              onClick={() =>
                startSend(async () => {
                  const result = await sendPreviewReminder(invoiceId).catch(() => ({
                    error: tErrors("previewFailed"),
                  }));
                  if ("error" in result) toast.error(result.error);
                  else toast.success(tActions("sendPreviewToast", { count: result.count }));
                })
              }
            >
              <Send /> {sendPending ? tActions("sending") : t("emailMe")}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
