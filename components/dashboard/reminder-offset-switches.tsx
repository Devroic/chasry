"use client";

import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SERIOUSLY_OVERDUE_THRESHOLD_DAYS } from "@/lib/reminders";

export const GENTLE_OFFSETS = [-7, -3, -1, 0, 1, 3, 7];
export const FIRM_OFFSETS = [14, 30];
export const ALL_OFFSETS = [...GENTLE_OFFSETS, ...FIRM_OFFSETS];

function offsetLabel(t: ReturnType<typeof useTranslations<"offsetPicker">>, value: number) {
  if (value === 0) return t("onDueDateOption");
  if (value < 0) return t("daysBeforeDue", { days: Math.abs(value) });
  return t("daysAfterDue", { days: value });
}

/**
 * Pure presentational offset-picker grid, shared by the global reminder
 * settings page and the per-client/per-invoice override sections — keeps
 * all three visually and behaviorally identical.
 */
export function ReminderOffsetSwitches({
  idPrefix,
  offsets,
  onToggle,
}: {
  /** Distinguishes ids when this renders more than once on a page (e.g. invoice form + a modal). */
  idPrefix: string;
  offsets: number[];
  onToggle: (value: number, checked: boolean) => void;
}) {
  const t = useTranslations("offsetPicker");
  const tSettings = useTranslations("settings.reminders");

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {GENTLE_OFFSETS.map((value) => (
          <div key={value} className="flex items-center justify-between">
            <Label htmlFor={`${idPrefix}_${value}`} className="text-sm font-normal">
              {offsetLabel(t, value)}
            </Label>
            <Switch
              id={`${idPrefix}_${value}`}
              checked={offsets.includes(value)}
              onCheckedChange={(checked) => onToggle(value, checked)}
            />
          </div>
        ))}
      </div>

      <div>
        <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {tSettings("firmNotice", { days: SERIOUSLY_OVERDUE_THRESHOLD_DAYS })}
        </p>
        <div className="space-y-3">
          {FIRM_OFFSETS.map((value) => (
            <div key={value} className="flex items-center justify-between">
              <Label htmlFor={`${idPrefix}_${value}`} className="text-sm font-normal">
                {offsetLabel(t, value)}
              </Label>
              <Switch
                id={`${idPrefix}_${value}`}
                checked={offsets.includes(value)}
                onCheckedChange={(checked) => onToggle(value, checked)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
