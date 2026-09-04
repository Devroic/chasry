"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { deleteAccount } from "./actions";

export function DangerZone() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const t = useTranslations("settings.dangerZone");
  const tCommon = useTranslations("common");

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="text-base text-destructive">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{t("description")}</p>
        {/* While deleting, the dialog can't be dismissed (cancel, Esc, overlay, X). */}
        <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
          <DialogTrigger asChild>
            <Button variant="destructive" className="shrink-0">
              {t("deleteAccount")}
            </Button>
          </DialogTrigger>
          <DialogContent showCloseButton={!pending}>
            <DialogHeader>
              <DialogTitle>{t("confirmTitle")}</DialogTitle>
              <DialogDescription>{t("confirmDescription")}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>
                {tCommon("cancel")}
              </Button>
              <Button
                variant="destructive"
                loading={pending}
                onClick={() => startTransition(async () => deleteAccount())}
              >
                {pending ? t("deleting") : t("confirmSubmit")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
