"use client";

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
import { completeOnboarding, type OnboardingState } from "./actions";
import { FREE_INVOICE_LIMIT } from "@/lib/plan";
import { profileSchema } from "@/lib/validations/profile";
import { toFormData } from "@/lib/utils";
import type { z } from "zod";

const onboardingSchema = (t: Parameters<typeof profileSchema>[0]) =>
  profileSchema(t).pick({ business_name: true, currency: true });
type OnboardingFormValues = z.input<ReturnType<typeof onboardingSchema>>;
type OnboardingInput = z.infer<ReturnType<typeof onboardingSchema>>;

const CURRENCIES = ["EUR", "USD", "GBP"];

export function OnboardingForm({
  defaultBusinessName,
}: {
  defaultBusinessName: string;
}) {
  const hasBusinessName = defaultBusinessName.trim().length > 0;
  const [state, formAction, pending] = useActionState<OnboardingState, FormData>(
    completeOnboarding,
    null
  );
  const t = useTranslations("onboarding");
  const tValidation = useTranslations("validation");
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<OnboardingFormValues, unknown, OnboardingInput>({
    resolver: zodResolver(onboardingSchema(tValidation)),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      business_name: defaultBusinessName,
      currency: "EUR",
    },
  });

  const onValid = (data: OnboardingInput) => startTransition(() => formAction(toFormData(data)));

  return (
    <form onSubmit={handleSubmit(onValid)} noValidate className="mt-8 space-y-4">
      {state?.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {hasBusinessName ? (
        <>
          <input type="hidden" {...register("business_name")} />
          <p className="text-sm text-muted-foreground">
            {t.rich("businessNameConfirm", {
              name: defaultBusinessName,
              strong: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
            })}
          </p>
        </>
      ) : (
        <FormField
          label={t("businessNameLabel")}
          htmlFor="business_name"
          error={errors.business_name?.message}
          hint={errors.business_name ? undefined : t("businessNameHint")}
        >
          <Input
            id="business_name"
            placeholder={t("businessNamePlaceholder")}
            className="h-11"
            aria-invalid={!!errors.business_name}
            {...register("business_name")}
          />
        </FormField>
      )}

      <FormField label={t("currency")} htmlFor="currency" error={errors.currency?.message}>
        <Controller
          name="currency"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="currency" className="h-11 w-full sm:w-40">
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

      <Button type="submit" className="h-11 w-full text-base font-semibold" loading={pending}>
        {pending ? t("submitting") : t("submit")}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        {t("freeNotice", { limit: FREE_INVOICE_LIMIT })}
      </p>
    </form>
  );
}
