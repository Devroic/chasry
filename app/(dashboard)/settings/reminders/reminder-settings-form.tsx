"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { updateReminderSettings, type ReminderSettingsState } from "./actions";

const OFFSET_OPTIONS = [
  { value: -7, label: "7 days before due" },
  { value: -3, label: "3 days before due" },
  { value: -1, label: "1 day before due" },
  { value: 0, label: "On the due date" },
  { value: 1, label: "1 day after due" },
  { value: 3, label: "3 days after due" },
  { value: 7, label: "7 days after due" },
];

export function ReminderSettingsForm({
  defaultOffsets,
  defaultEnabled,
}: {
  defaultOffsets: number[];
  defaultEnabled: boolean;
}) {
  const [state, formAction, pending] = useActionState<ReminderSettingsState, FormData>(
    updateReminderSettings,
    null
  );

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      {state?.success && (
        <Alert>
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between rounded-lg border border-border p-4">
        <div>
          <Label htmlFor="enabled" className="text-sm font-medium">
            Reminders enabled
          </Label>
          <p className="text-xs text-muted-foreground">Turn off to pause all reminder emails.</p>
        </div>
        <Switch id="enabled" name="enabled" defaultChecked={defaultEnabled} />
      </div>

      <div className="space-y-3">
        {OFFSET_OPTIONS.map((option) => (
          <div key={option.value} className="flex items-center justify-between">
            <Label htmlFor={`offset_${option.value}`} className="text-sm font-normal">
              {option.label}
            </Label>
            <Switch
              id={`offset_${option.value}`}
              name={`offset_${option.value}`}
              defaultChecked={defaultOffsets.includes(option.value)}
            />
          </div>
        ))}
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save schedule"}
      </Button>
    </form>
  );
}
