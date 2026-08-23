"use client";

import Link from "next/link";
import { useActionState, startTransition } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { FormField } from "@/components/ui/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { signup, type AuthFormState } from "@/app/(auth)/actions";
import { signupSchema, type SignupInput } from "@/lib/validations/auth";
import { toFormData } from "@/lib/utils";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(signup, null);
  const t = useTranslations("auth.signup");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
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
