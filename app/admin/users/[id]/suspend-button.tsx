"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Ban, RotateCcw } from "lucide-react";
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
import { setUserSuspended } from "@/app/admin/users/actions";
import { BlockingOverlay } from "@/components/blocking-overlay";

/** Suspend (behind a confirmation dialog) or reinstate one account. */
export function SuspendUserButton({
  userId,
  userLabel,
  suspended,
}: {
  userId: string;
  /** Business name or email, named in the confirmation copy. */
  userLabel: string;
  suspended: boolean;
}) {
  const t = useTranslations("admin.suspend");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (suspended) {
    return (
      <>
      <BlockingOverlay show={pending} spinner={false} />
      <Button
        variant="outline"
        loading={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await setUserSuspended(userId, false).catch(() => ({ error: t("failed") }));
            if (result?.error) toast.error(result.error);
            else toast.success(t("reinstatedToast"));
          })
        }
      >
        <RotateCcw /> {t("reinstate")}
      </Button>
      </>
    );
  }

  const effects = [t("effectAccess"), t("effectEmails"), t("effectData")];

  return (
    // While saving, the dialog can't be dismissed (cancel, Esc, overlay, X).
    <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-destructive hover:text-destructive">
          <Ban /> {t("button")}
        </Button>
      </DialogTrigger>
      <DialogContent showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description", { name: userLabel })}</DialogDescription>
        </DialogHeader>
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-foreground">
          {effects.map((effect) => (
            <li key={effect}>{effect}</li>
          ))}
        </ul>
        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>
            {t("cancel")}
          </Button>
          <Button
            variant="destructive"
            loading={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await setUserSuspended(userId, true).catch(() => ({ error: t("failed") }));
                if (result?.error) {
                  toast.error(result.error);
                  return;
                }
                setOpen(false);
                toast.success(t("suspendedToast"));
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
