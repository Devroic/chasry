"use server";

import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { changePasswordSchema } from "@/lib/validations/auth";

export type PasswordFormState = { error?: string; success?: string; description?: string } | null;

export async function changePassword(
  _prev: PasswordFormState,
  formData: FormData
): Promise<PasswordFormState> {
  const t = await getTranslations("validation");
  const tSec = await getTranslations("settings.profile.security");

  const parsed = changePasswordSchema(t).safeParse({
    current_password: formData.get("current_password"),
    password: formData.get("password"),
    confirm_password: formData.get("confirm_password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? t("invalidInput") };

  const { supabase, user } = await requireUser();

  // Re-authenticate with the current password first, so an unattended or
  // hijacked session can't change the password without knowing the old one.
  if (!user.email) return { error: tSec("passwordFailed") };
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.current_password,
  });
  if (reauthError) return { error: tSec("currentPasswordIncorrect") };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") return { error: tSec("samePassword") };
    if (error.code === "weak_password") return { error: t("passwordMinLength") };
    return { error: tSec("passwordFailed") };
  }
  return { success: tSec("passwordChangedTitle") };
}
