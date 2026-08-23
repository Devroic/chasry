"use client";

import { useTransition } from "react";
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
  const [pending, startTransition] = useTransition();
  const t = useTranslations("settings.dangerZone");

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="text-base text-destructive">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{t("description")}</p>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="destructive" className="shrink-0">
              {t("deleteAccount")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("confirmTitle")}</DialogTitle>
              <DialogDescription>{t("confirmDescription")}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="destructive"
                disabled={pending}
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
