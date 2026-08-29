"use client";

import { useActionState, startTransition } from "react";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormField } from "@/components/ui/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateProfile, type ProfileFormState } from "./actions";
import { profileSchema, type ProfileInput } from "@/lib/validations/profile";
import { toFormData } from "@/lib/utils";
import { useSuccessToast } from "@/lib/use-success-toast";
import { LOCALES, type Locale } from "@/lib/locale";
import type { z } from "zod";

type ProfileFormValues = z.input<ReturnType<typeof profileSchema>>;

const CURRENCIES = ["EUR", "USD", "GBP"];

export function ProfileForm({
  defaultValues,
  email,
}: {
  defaultValues: {
    business_name: string;
    currency: string;
    payment_link: string;
    reminder_locale: "en" | "el";
  };
  email: string;
}) {
  const [state, formAction, pending] = useActionState<ProfileFormState, FormData>(
    updateProfile,
    null
  );
  const t = useTranslations("settings.profile");
  const tCommon = useTranslations("common");
  const tValidation = useTranslations("validation");
  const localeLabels: Record<Locale, string> = {
    en: tCommon("localeNames.en"),
    el: tCommon("localeNames.el"),
  };
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormValues, unknown, ProfileInput>({
    resolver: zodResolver(profileSchema(tValidation)),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      business_name: defaultValues.business_name,
      currency: defaultValues.currency,
      payment_link: defaultValues.payment_link,
      reminder_locale: defaultValues.reminder_locale,
    },
  });

  useSuccessToast(state);

  const onValid = (data: ProfileInput) => startTransition(() => formAction(toFormData(data)));

  return (
    <form onSubmit={handleSubmit(onValid)} noValidate className="space-y-4">
      {state?.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-1.5">
        <Label>{t("emailLabel")}</Label>
        <Input value={email} disabled />
      </div>

      <FormField label={t("businessNameLabel")} htmlFor="business_name" error={errors.business_name?.message}>
        <Input
          id="business_name"
          aria-invalid={!!errors.business_name}
          {...register("business_name")}
        />
      </FormField>

      <FormField label={t("currencyLabel")} htmlFor="currency" error={errors.currency?.message}>
        <Controller
          name="currency"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="currency" className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
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

      <Button type="submit" loading={pending}>
        {pending ? tCommon("saving") : tCommon("saveChanges")}
      </Button>
    </form>
  );
}
