"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { FormField } from "@/components/ui/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase/client";
import { updatePasswordSchema } from "@/lib/validations/auth";
import type { z } from "zod";

type UpdatePasswordInput = z.infer<ReturnType<typeof updatePasswordSchema>>;

export default function ResetPasswordConfirmPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const t = useTranslations("auth.resetPasswordConfirm");
  const tValidation = useTranslations("validation");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdatePasswordInput>({
    resolver: zodResolver(updatePasswordSchema(tValidation)),
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  async function onValid(data: UpdatePasswordInput) {
    setPending(true);
    setServerError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: data.password });

    if (error) {
      if (error.code === "same_password") {
        setServerError(t("samePasswordError"));
      } else if (error.code === "weak_password") {
        setServerError(t("weakPasswordError"));
      } else {
        setServerError(t("expiredError"));
      }
      setPending(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
        {t("title")}
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{t("subtitle")}</p>

      <form onSubmit={handleSubmit(onValid)} noValidate className="mt-8 space-y-4">
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <FormField
          label={t("newPassword")}
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
    </div>
  );
}
