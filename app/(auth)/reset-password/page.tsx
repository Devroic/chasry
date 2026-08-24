"use client";

import Link from "next/link";
import { useActionState, startTransition } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { requestPasswordReset, type AuthFormState } from "@/app/(auth)/actions";
import { requestResetSchema } from "@/lib/validations/auth";
import { toFormData } from "@/lib/utils";
import type { z } from "zod";

type ResetInput = z.infer<ReturnType<typeof requestResetSchema>>;

export default function ResetPasswordPage() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    requestPasswordReset,
    null
  );
  const t = useTranslations("auth.resetPassword");
  const tValidation = useTranslations("validation");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetInput>({
    resolver: zodResolver(requestResetSchema(tValidation)),
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const onValid = (data: ResetInput) => startTransition(() => formAction(toFormData(data)));

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
        {t("title")}
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{t("subtitle")}</p>

      {state?.success ? (
        <Alert className="mt-8">
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
      ) : (
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

          <Button type="submit" className="h-11 w-full text-base font-semibold" loading={pending}>
            {pending ? t("submitting") : t("submit")}
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-brand-primary hover:underline">
          {t("backToLogin")}
        </Link>
      </p>
    </div>
  );
}
