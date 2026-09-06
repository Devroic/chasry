"use client";

import { useActionState, startTransition } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { FormField } from "@/components/ui/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BlockingOverlay } from "@/components/blocking-overlay";
import { changePassword, type PasswordFormState } from "./actions";
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/validations/auth";
import { toFormData } from "@/lib/utils";
import { useSuccessToast } from "@/lib/use-success-toast";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState<PasswordFormState, FormData>(
    changePassword,
    null
  );
  const t = useTranslations("settings.profile.security");
  const tCommon = useTranslations("common");
  const tValidation = useTranslations("validation");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema(tValidation)),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: { current_password: "", password: "", confirm_password: "" },
  });

  useSuccessToast(state);

  const onValid = (data: ChangePasswordInput) =>
    startTransition(() => formAction(toFormData(data)));

  return (
    <form onSubmit={handleSubmit(onValid)} noValidate className="space-y-4">
      <BlockingOverlay show={pending} spinner={false} />
      {state?.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <FormField
        label={t("currentPasswordLabel")}
        htmlFor="current_password"
        error={errors.current_password?.message}
      >
        <PasswordInput
          id="current_password"
          autoComplete="current-password"
          aria-invalid={!!errors.current_password}
          {...register("current_password")}
        />
      </FormField>

      <FormField label={t("newPasswordLabel")} htmlFor="new_password" error={errors.password?.message}>
        <PasswordInput
          id="new_password"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          {...register("password")}
        />
      </FormField>

      <FormField
        label={t("confirmPasswordLabel")}
        htmlFor="confirm_new_password"
        error={errors.confirm_password?.message}
      >
        <PasswordInput
          id="confirm_new_password"
          autoComplete="new-password"
          aria-invalid={!!errors.confirm_password}
          {...register("confirm_password")}
        />
      </FormField>

      <Button type="submit" loading={pending}>
        {pending ? tCommon("saving") : t("changePasswordButton")}
      </Button>
    </form>
  );
}
