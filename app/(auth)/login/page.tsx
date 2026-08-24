"use client";

import { Suspense, startTransition } from "react";
import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { FormField } from "@/components/ui/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { login, type AuthFormState } from "@/app/(auth)/actions";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { toFormData } from "@/lib/utils";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(login, null);
  const next = useSearchParams().get("next");
  const t = useTranslations("auth.login");
  const tValidation = useTranslations("validation");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema(tValidation)),
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const onValid = (data: LoginInput) =>
    startTransition(() => formAction(toFormData({ ...data, next })));

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{t("title")}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{t("subtitle")}</p>

      <form onSubmit={handleSubmit(onValid)} noValidate className="mt-8 space-y-4">
        {state?.error && (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

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
          labelAction={
            <Link
              href="/reset-password"
              className="text-xs font-medium text-brand-primary hover:underline"
            >
              {t("forgotPassword")}
            </Link>
          }
        >
          <PasswordInput
            id="password"
            autoComplete="current-password"
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
        {t("newToChasry")}{" "}
        <Link href="/signup" className="font-medium text-brand-primary hover:underline">
          {t("signUpNow")}
        </Link>
      </p>
    </div>
  );
}
