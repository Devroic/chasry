"use client";

import Link from "next/link";
import { useActionState, startTransition } from "react";
import { BlockingOverlay } from "@/components/blocking-overlay";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { signup, type AuthFormState } from "@/app/(auth)/actions";
import { signupSchema, type SignupInput } from "@/lib/validations/auth";
import { toFormData } from "@/lib/utils";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(signup, null);
  const t = useTranslations("auth.signup");
  const tValidation = useTranslations("validation");
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema(tValidation)),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: { terms_accepted: false },
  });

  const onValid = (data: SignupInput) => startTransition(() => formAction(toFormData(data)));

  if (state?.success) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          {t("checkInboxTitle")}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">{state.success}</p>
        <Button asChild className="mt-6 h-11 w-full text-base font-semibold">
          <Link href="/login">{t("goToLogin")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
        {t("title")}
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{t("subtitle")}</p>

      <form onSubmit={handleSubmit(onValid)} noValidate className="mt-8 space-y-4">
        <BlockingOverlay show={pending} spinner={false} />
        {state?.error && (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        <FormField label={t("businessName")} htmlFor="business_name" error={errors.business_name?.message}>
          <Input
            id="business_name"
            autoComplete="organization"
            className="h-11"
            aria-invalid={!!errors.business_name}
            {...register("business_name")}
          />
        </FormField>

        <FormField label={t("email")} htmlFor="email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            className="h-11"
            aria-invalid={!!errors.email}
            {...register("email")}
          />
        </FormField>

        <FormField
          label={t("password")}
          htmlFor="password"
          error={errors.password?.message}
          hint={errors.password ? undefined : t("passwordHint")}
        >
          <PasswordInput
            id="password"
            autoComplete="new-password"
            className="h-11"
            aria-invalid={!!errors.password}
            {...register("password")}
          />
        </FormField>

        <FormField
          label={t("confirmPassword")}
          htmlFor="confirm_password"
          error={errors.confirm_password?.message}
        >
          <PasswordInput
            id="confirm_password"
            autoComplete="new-password"
            className="h-11"
            aria-invalid={!!errors.confirm_password}
            {...register("confirm_password")}
          />
        </FormField>

        <div className="space-y-1.5">
          <div className="flex items-start gap-2">
            <Controller
              name="terms_accepted"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="terms_accepted"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  aria-invalid={!!errors.terms_accepted}
                  className="mt-0.5"
                />
              )}
            />
            <label htmlFor="terms_accepted" className="text-sm text-muted-foreground">
              {t("termsAgreementPrefix")}{" "}
              <Link
                href="/terms?standalone=1"
                target="_blank"
                className="font-medium text-brand-primary hover:underline"
              >
                {t("termsLink")}
              </Link>{" "}
              {t("termsAgreementAnd")}{" "}
              <Link
                href="/privacy?standalone=1"
                target="_blank"
                className="font-medium text-brand-primary hover:underline"
              >
                {t("privacyLink")}
              </Link>
            </label>
          </div>
          {errors.terms_accepted && (
            <p className="text-xs text-destructive">{errors.terms_accepted.message}</p>
          )}
        </div>

        <Button type="submit" className="h-11 w-full text-base font-semibold" loading={pending}>
          {pending ? t("submitting") : t("submit")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("alreadyHaveAccount")}{" "}
        <Link href="/login" className="font-medium text-brand-primary hover:underline">
          {t("logIn")}
        </Link>
      </p>
    </div>
  );
}
