"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { checkAuthRateLimit } from "@/lib/rate-limit";
import { safeNextPath } from "@/lib/supabase/middleware";
import { loginSchema, signupSchema, requestResetSchema } from "@/lib/validations/auth";

export type AuthFormState = { error?: string; success?: string } | null;

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function login(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const t = await getTranslations("validation");
  const tErrors = await getTranslations("auth.errors");
  const tLogin = await getTranslations("auth.login.errors");

  const ip = await clientIp();
  const { success } = await checkAuthRateLimit(`login:${ip}`);
  if (!success) return { error: tErrors("tooManyAttempts") };

  const parsed = loginSchema(t).safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? tErrors("invalidInput") };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: tLogin("incorrectCredentials") };

  redirect(safeNextPath(formData.get("next")?.toString()));
}

export async function signup(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const t = await getTranslations("validation");
  const tErrors = await getTranslations("auth.errors");
  const tSignup = await getTranslations("auth.signup");
  const tSignupErrors = await getTranslations("auth.signup.errors");

  const ip = await clientIp();
  const { success } = await checkAuthRateLimit(`signup:${ip}`);
  if (!success) return { error: tErrors("tooManyAttempts") };

  const parsed = signupSchema(t).safeParse({
    business_name: formData.get("business_name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? tErrors("invalidInput") };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { business_name: parsed.data.business_name },
      emailRedirectTo: `${appUrl}/signup/confirmed`,
    },
  });
  if (error) {
    if (error.code === "user_already_exists" || error.code === "email_exists") {
      return { error: tSignupErrors("accountExists") };
    }
    if (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit") {
      return { error: tSignupErrors("rateLimited") };
    }
    if (error.code === "weak_password") {
      return { error: tSignupErrors("weakPassword") };
    }
    return { error: tSignupErrors("generic") };
  }

  // Supabase doesn't return an error for a duplicate, already-confirmed email
  // (anti-enumeration by design) — it signals this instead via an empty
  // `identities` array on an otherwise normal-looking response.
  if (data.user && data.user.identities?.length === 0) {
    return { error: tSignupErrors("accountExists") };
  }

  // No profile UPDATE here on purpose. `business_name` is carried in the
  // signUp metadata above and written into public.profiles by the
  // handle_new_user trigger (see 0006_handle_new_user_business_name.sql).
  // This used to do a follow-up `.update()`, which quietly did nothing
  // whenever email confirmation is required: there's no session yet at this
  // point, so the RLS-scoped client had no permission to write the row — and
  // onboarding then asked for the business name a second time.

  // Email confirmation required (Supabase default) → session isn't active yet.
  if (!data.session) {
    return { success: tSignup("checkEmailMessage") };
  }

  redirect("/onboarding");
}

export async function requestPasswordReset(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const t = await getTranslations("validation");
  const tErrors = await getTranslations("auth.errors");
  const tReset = await getTranslations("auth.resetPassword");

  const ip = await clientIp();
  const { success } = await checkAuthRateLimit(`reset:${ip}`);
  if (!success) return { error: tErrors("tooManyAttempts") };

  const parsed = requestResetSchema(t).safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? tErrors("invalidInput") };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl}/reset-password/confirm`,
  });

  // Always report success, regardless of whether the email exists — avoids
  // leaking which addresses are registered.
  return { success: tReset("successMessage") };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
