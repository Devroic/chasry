"use client";
import { BlockingOverlay } from "@/components/blocking-overlay";

import { useActionState, startTransition } from "react";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { z } from "zod";

type ProfileFormValues = z.input<ReturnType<typeof profileSchema>>;

const CURRENCIES = ["EUR", "USD", "GBP"];

export function ProfileForm({
  defaultValues,
}: {
  defaultValues: {
    business_name: string;
    currency: string;
    email: string;
  };
}) {
  const [state, formAction, pending] = useActionState<ProfileFormState, FormData>(
    updateProfile,
    null
  );
  const t = useTranslations("settings.profile");
  const tCommon = useTranslations("common");
  const tValidation = useTranslations("validation");
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
      email: defaultValues.email,
    },
  });

  // Email changes surface an inline, persistent "confirm your new inbox" alert;
  // an ordinary save just toasts.
  useSuccessToast(state?.emailPending ? null : state);

  const onValid = (data: ProfileInput) => startTransition(() => formAction(toFormData(data)));

  return (
    <form onSubmit={handleSubmit(onValid)} noValidate className="space-y-4">
      <BlockingOverlay show={pending} spinner={false} />
      {state?.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      {state?.emailPending && state?.success && (
        <Alert className="border-emerald-200 bg-emerald-50 dark:border-emerald-400/20 dark:bg-emerald-400/10">
          <AlertDescription className="text-emerald-800 dark:text-emerald-300">
            {state.success} {state.description}
          </AlertDescription>
        </Alert>
      )}

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
        label={t("emailLabel")}
        htmlFor="email"
        error={errors.email?.message}
        hint={errors.email ? undefined : t("emailHint")}
      >
        <Input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
      </FormField>

      <Button type="submit" loading={pending}>
        {pending ? tCommon("saving") : tCommon("saveChanges")}
      </Button>
    </form>
  );
}
