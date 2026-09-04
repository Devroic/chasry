"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { FormField } from "@/components/ui/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BlockingOverlay } from "@/components/blocking-overlay";
import { createClient } from "@/lib/supabase/client";
import { updatePasswordSchema } from "@/lib/validations/auth";
import type { z } from "zod";

type UpdatePasswordInput = z.infer<ReturnType<typeof updatePasswordSchema>>;

export default function ResetPasswordConfirmPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // Same pattern as /signup/confirmed: a failed/expired code exchange leaves no
  // session, so show that up front instead of after the user types a password.
  const [linkStatus, setLinkStatus] = useState<"checking" | "valid" | "invalid">("checking");
  const t = useTranslations("auth.resetPasswordConfirm");
  const tValidation = useTranslations("validation");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setLinkStatus(data.session ? "valid" : "invalid");
    });
  }, []);
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

  if (linkStatus === "checking") {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <Loader2 className="size-6 animate-spin text-brand-primary" aria-label={t("checking")} />
      </div>
    );
  }

  if (linkStatus === "invalid") {
    return (
      <div className="flex flex-col items-center py-4 text-center">
        <XCircle className="size-10 text-destructive" />
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-foreground">
          {t("expiredTitle")}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{t("expiredSubtitle")}</p>
        <Button asChild className="mt-8 h-11 w-full text-base font-semibold">
          <Link href="/reset-password">{t("requestNewLink")}</Link>
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
