"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowDown, X } from "lucide-react";
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
import { cancelSubscription } from "./actions";

/** Confirms the downgrade, spelling out what Pro perks end at the period boundary. */
export function DowngradeDialog({
  periodEndLabel,
  freeLimit,
}: {
  /** Formatted date Pro access ends on; null when Stripe hasn't provided one yet. */
  periodEndLabel: string | null;
  freeLimit: number;
}) {
  const t = useTranslations("settings.billing.downgrade");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const losses = [
    t("lossLimit", { limit: freeLimit }),
    t("lossRecurring"),
    t("lossAttachments"),
    t("lossBranding"),
  ];

  return (
    // While canceling with Stripe, the dialog can't be dismissed (cancel, Esc, overlay, X).
    <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full text-muted-foreground">
          <ArrowDown /> {t("button")}
        </Button>
      </DialogTrigger>
      <DialogContent showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {periodEndLabel
              ? t("descriptionDated", { date: periodEndLabel })
              : t("descriptionUndated")}
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-1.5">
          {losses.map((loss) => (
            <li key={loss} className="flex items-start gap-2.5 text-sm text-foreground">
              <X aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive" />
              <span>{loss}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">{t("reassurance")}</p>
        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>
            {t("keepPro")}
          </Button>
          <Button
            variant="destructive"
            loading={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await cancelSubscription().catch(() => ({ error: t("failed") }));
                if (result?.error) {
                  toast.error(result.error);
                  return;
                }
                setOpen(false);
                toast.success(
                  periodEndLabel ? t("toastDated", { date: periodEndLabel }) : t("toastUndated")
                );
              })
            }
          >
            {pending ? t("confirming") : t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
