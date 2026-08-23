"use client";

import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ReminderOffsetSwitches } from "@/components/dashboard/reminder-offset-switches";
import { describeReminderSchedule } from "@/lib/reminders";

/**
 * "Use the default, or customize just for this one" block — identical
 * shape used on both the client form and the invoice form, so switching
 * between them doesn't require relearning the UI.
 */
export function ReminderOverrideSection({
  idPrefix,
  scopeLabel,
  fallbackOffsets,
  fallbackEnabled,
  active,
  onActiveChange,
  enabled,
  onEnabledChange,
  offsets,
  onToggleOffset,
}: {
  idPrefix: string;
  /** e.g. "this client" or "this invoice" */
  scopeLabel: string;
  /** The effective schedule that applies when there's no override — shown as context. */
  fallbackOffsets: number[];
  fallbackEnabled: boolean;
  active: boolean;
  onActiveChange: (active: boolean) => void;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  offsets: number[];
  onToggleOffset: (value: number, checked: boolean) => void;
}) {
  const t = useTranslations("reminderOverride");

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Label htmlFor={`${idPrefix}_active`} className="text-sm font-medium">
            {t("customTitle")}
          </Label>
          <p className="text-xs text-muted-foreground">
            {active
              ? t("activeDescription", { scope: scopeLabel })
              : t("inactiveDescription", {
                  schedule: describeReminderSchedule(fallbackOffsets, fallbackEnabled, t),
                })}
          </p>
        </div>
        <Switch id={`${idPrefix}_active`} checked={active} onCheckedChange={onActiveChange} />
      </div>

      {active && (
        <div className="mt-4 space-y-4 border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <Label htmlFor={`${idPrefix}_enabled`} className="text-sm font-normal">
              {t("enabledFor", { scope: scopeLabel })}
            </Label>
            <Switch id={`${idPrefix}_enabled`} checked={enabled} onCheckedChange={onEnabledChange} />
          </div>
          {enabled && (
            <ReminderOffsetSwitches idPrefix={idPrefix} offsets={offsets} onToggle={onToggleOffset} />
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onActiveChange(false)}
            className="text-muted-foreground"
          >
            {t("removeOverride")}
          </Button>
        </div>
      )}
    </div>
  );
}
