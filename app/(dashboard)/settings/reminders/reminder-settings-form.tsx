"use client";

import { startTransition, useActionState } from "react";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ReminderOffsetSwitches } from "@/components/dashboard/reminder-offset-switches";
import { updateReminderSettings, type ReminderSettingsState } from "./actions";
import { reminderOffsetsSchema, type ReminderOffsetsInput } from "@/lib/validations/invoice";
import { useSuccessToast } from "@/lib/use-success-toast";

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
  const t = useTranslations("settings.reminders");
  const tCommon = useTranslations("common");
  const tValidation = useTranslations("validation");
  const { control, watch, setValue, handleSubmit } = useForm<ReminderOffsetsInput>({
    resolver: zodResolver(reminderOffsetsSchema(tValidation)),
    defaultValues: { enabled: defaultEnabled, offsets: defaultOffsets },
  });
  const offsets = watch("offsets");
  const enabled = watch("enabled");

  useSuccessToast(state);

  function toggleOffset(value: number, checked: boolean) {
    setValue(
      "offsets",
      checked ? [...offsets, value] : offsets.filter((v) => v !== value),
      { shouldValidate: true }
    );
  }

  // Translated to individual offset_${n} keys — the server action's existing FormData shape.
  const onValid = (data: ReminderOffsetsInput) => {
    const formData = new FormData();
    formData.set("enabled", data.enabled ? "on" : "");
    for (const offset of data.offsets) {
      formData.set(`offset_${offset}`, "on");
    }
    startTransition(() => formAction(formData));
  };

  return (
    <form onSubmit={handleSubmit(onValid)} noValidate className="space-y-6">
      {state?.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between rounded-lg border border-border p-4">
        <div>
          <Label htmlFor="enabled" className="text-sm font-medium">
            {t("enabledLabel")}
          </Label>
          <p className="text-xs text-muted-foreground">{t("enabledHint")}</p>
        </div>
        <Controller
          name="enabled"
          control={control}
          render={({ field }) => (
            <Switch id="enabled" checked={field.value} onCheckedChange={field.onChange} />
          )}
        />
      </div>

      {enabled && (
        <ReminderOffsetSwitches idPrefix="offset" offsets={offsets} onToggle={toggleOffset} />
      )}

      <Button type="submit" loading={pending}>
        {pending ? tCommon("saving") : t("submit")}
      </Button>
    </form>
  );
}
