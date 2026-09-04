"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateDigestPreference } from "./actions";

/** Single-switch control, saved immediately on toggle (no Save button). */
export function DigestToggle({ defaultEnabled }: { defaultEnabled: boolean }) {
  const t = useTranslations("settings.digest");
  const [enabled, setEnabled] = useState(defaultEnabled);
  const [, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <Label htmlFor="digest_enabled" className="text-sm font-medium">
          {t("label")}
        </Label>
        <p className="text-xs text-muted-foreground">{t("hint")}</p>
      </div>
      <Switch
        id="digest_enabled"
        checked={enabled}
        onCheckedChange={(next) => {
          setEnabled(next);
          startTransition(async () => {
            try {
              await updateDigestPreference(next);
              toast.success(next ? t("enabledToast") : t("disabledToast"));
            } catch (err) {
              setEnabled(!next);
              toast.error(err instanceof Error ? err.message : t("failed"));
            }
          });
        }}
      />
    </div>
  );
}
