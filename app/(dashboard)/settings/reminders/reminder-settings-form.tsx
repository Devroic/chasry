"use client";
import { BlockingOverlay } from "@/components/blocking-overlay";

import { startTransition, useActionState } from "react";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FormField } from "@/components/ui/form-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReminderOffsetSwitches } from "@/components/dashboard/reminder-offset-switches";
import { updateReminderSettings, type ReminderSettingsState } from "./actions";
import {
  reminderSettingsFormSchema,
  type ReminderSettingsFormInput,
} from "@/lib/validations/invoice";
import { useSuccessToast } from "@/lib/use-success-toast";
import { LOCALES, type Locale } from "@/lib/locale";
import type { z } from "zod";

type ReminderSettingsFormValues = z.input<ReturnType<typeof reminderSettingsFormSchema>>;

export function ReminderSettingsForm({
  defaultOffsets,
  defaultEnabled,
  defaultCopySelf,
  defaultPaymentLink,
  defaultReminderLocale,
}: {
  defaultOffsets: number[];
  defaultEnabled: boolean;
  defaultCopySelf: boolean;
  defaultPaymentLink: string;
  defaultReminderLocale: "en" | "el";
}) {
  const [state, formAction, pending] = useActionState<ReminderSettingsState, FormData>(
    updateReminderSettings,
    null
  );
  const t = useTranslations("settings.reminders");
  const tCommon = useTranslations("common");
  const tValidation = useTranslations("validation");
  const localeLabels: Record<Locale, string> = {
    en: tCommon("localeNames.en"),
    el: tCommon("localeNames.el"),
  };
  const {
    register,
    control,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<ReminderSettingsFormValues, unknown, ReminderSettingsFormInput>({
    resolver: zodResolver(reminderSettingsFormSchema(tValidation)),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      enabled: defaultEnabled,
      offsets: defaultOffsets,
      copy_self: defaultCopySelf,
      payment_link: defaultPaymentLink,
      reminder_locale: defaultReminderLocale,
    },
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

  // Offsets go out as individual offset_${n} keys (the server action's FormData
  // shape); payment link and language ride along as plain fields.
  const onValid = (data: ReminderSettingsFormInput) => {
    const formData = new FormData();
    formData.set("enabled", data.enabled ? "on" : "");
    formData.set("copy_self", data.copy_self ? "on" : "");
    for (const offset of data.offsets) {
      formData.set(`offset_${offset}`, "on");
    }
    formData.set("payment_link", data.payment_link ?? "");
    formData.set("reminder_locale", data.reminder_locale);
    startTransition(() => formAction(formData));
  };

  return (
    <form onSubmit={handleSubmit(onValid)} noValidate className="space-y-6">
      <BlockingOverlay show={pending} spinner={false} />
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

      {enabled && (
        <FormField label={t("copySelfLabel")} htmlFor="copy_self" hint={t("copySelfHint")}>
          <Controller
            name="copy_self"
            control={control}
            render={({ field }) => (
              <Switch id="copy_self" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </FormField>
      )}

      {enabled && (
        <>
          <FormField
            label={t("reminderLocaleLabel")}
            htmlFor="reminder_locale"
            error={errors.reminder_locale?.message}
            hint={errors.reminder_locale ? undefined : t("reminderLocaleHint")}
          >
            <Controller
              name="reminder_locale"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="reminder_locale" className="w-full sm:w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCALES.map((locale) => (
                      <SelectItem key={locale} value={locale}>
                        {localeLabels[locale]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <FormField
            label={t("paymentLinkLabel")}
            htmlFor="payment_link"
            error={errors.payment_link?.message}
            hint={errors.payment_link ? undefined : t("paymentLinkHint")}
          >
            <Input
              id="payment_link"
              type="url"
              placeholder={tCommon("paymentLinkPlaceholder")}
              aria-invalid={!!errors.payment_link}
              {...register("payment_link")}
            />
          </FormField>
        </>
      )}

      <Button type="submit" loading={pending}>
        {pending ? tCommon("saving") : t("submit")}
      </Button>
    </form>
  );
}
