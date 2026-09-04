"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { AlarmClockOff, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { snoozeInvoice, unsnoozeInvoice } from "@/app/(dashboard)/invoices/actions";
import { BlockingOverlay } from "@/components/blocking-overlay";

function isoDaysFromToday(days: number) {
  // Local calendar dates: UTC math made "tomorrow" mean "today" east of UTC at night.
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Pauses every reminder for this invoice until a chosen date, without changing the schedule. */
export function SnoozeRemindersButton({
  invoiceId,
  snoozedUntil,
  snoozedUntilLabel,
}: {
  invoiceId: string;
  snoozedUntil: string | null;
  /** Pre-formatted (locale-aware) date, rendered when currently snoozed. */
  snoozedUntilLabel?: string;
}) {
  const t = useTranslations("invoices.snooze");
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(isoDaysFromToday(3));
  const [pending, startTransition] = useTransition();

  if (snoozedUntil) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-400/20 dark:bg-amber-400/10">
        <BlockingOverlay show={pending} spinner={false} />
        <p className="text-sm text-amber-800 dark:text-amber-300">
          {t("pausedUntil", { date: snoozedUntilLabel ?? snoozedUntil })}
        </p>
        <Button
          variant="ghost"
          size="sm"
          loading={pending}
          className="text-amber-800 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-200"
          onClick={() =>
            startTransition(async () => {
              const result = await unsnoozeInvoice(invoiceId);
              if (result?.error) toast.error(result.error);
              else toast.success(t("resumedToast"));
            })
          }
        >
          <Play /> {t("resume")}
        </Button>
      </div>
    );
  }

  return (
    // While saving, the dialog can't be dismissed (cancel, Esc, overlay, X).
    <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <AlarmClockOff /> {t("button")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="snooze_until">{t("dateLabel")}</Label>
          <div className="flex flex-wrap gap-1.5">
            {[
              { days: 1, label: t("presetTomorrow") },
              { days: 3, label: t("presetDays3") },
              { days: 7, label: t("presetWeek") },
            ].map((preset) => (
              <Button
                key={preset.days}
                type="button"
                variant={date === isoDaysFromToday(preset.days) ? "secondary" : "outline"}
                size="sm"
                onClick={() => setDate(isoDaysFromToday(preset.days))}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <Input
            id="snooze_until"
            type="date"
            value={date}
            min={isoDaysFromToday(1)}
            max={isoDaysFromToday(90)}
            onChange={(e) => setDate(e.target.value)}
            className="sm:w-56"
          />
          <p className="text-xs text-muted-foreground">{t("skippedNote")}</p>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={pending}>
              {t("cancel")}
            </Button>
          </DialogClose>
          <Button
            loading={pending}
            disabled={!date}
            onClick={() =>
              startTransition(async () => {
                const result = await snoozeInvoice(invoiceId, date).catch(() => ({ error: t("failed") }));
                if (result?.error) {
                  toast.error(result.error);
                  return;
                }
                setOpen(false);
                toast.success(t("snoozedToast"));
              })
            }
          >
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
