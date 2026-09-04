"use server";

import { getAppUrl, SUPPORT_EMAIL } from "@/lib/constants";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { checkAuthRateLimit } from "@/lib/rate-limit";
import { safeNextPath } from "@/lib/supabase/middleware";
import { loginSchema, signupSchema, requestResetSchema } from "@/lib/validations/auth";
import { requireUser } from "@/lib/auth";
import { resend, ACCOUNT_FROM_EMAIL } from "@/lib/resend";
import { logEmailSend } from "@/lib/email-log";
import WelcomeEmail from "@/emails/welcome";

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
  if (error) {
    if (error.code === "email_not_confirmed") return { error: tLogin("emailNotConfirmed") };
    // Suspension bans the auth user (see setUserSuspended), which surfaces here.
    if (error.code === "user_banned") {
      return { error: tLogin("accountSuspended", { email: SUPPORT_EMAIL }) };
    }
    return { error: tLogin("incorrectCredentials") };
  }

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
    confirm_password: formData.get("confirm_password"),
    terms_accepted: formData.get("terms_accepted") === "true",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? tErrors("invalidInput") };

  const appUrl = getAppUrl();
  const locale = await getLocale();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // Read by handle_new_user (migration 0016) to stamp these atomically at signup.
      data: {
        business_name: parsed.data.business_name,
        terms_accepted: parsed.data.terms_accepted,
        reminder_locale: locale,
      },
      emailRedirectTo: `${appUrl}/auth/confirm?next=/signup/confirmed`,
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

  // Duplicate confirmed email signals via an empty identities array, not an error.
  if (data.user && data.user.identities?.length === 0) {
    return { error: tSignupErrors("accountExists") };
  }

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

  const appUrl = getAppUrl();
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl}/auth/confirm?next=/reset-password/confirm`,
  });

  // Always report success — avoids leaking which emails are registered.
  return { success: tReset("successMessage") };
}

// welcome_email_sent_at acts as a claim so only one concurrent call sends.
export async function sendWelcomeEmail() {
  const { supabase, user } = await requireUser();
  if (!user.email) return;

  const { data, error } = await supabase
    .from("profiles")
    .update({ welcome_email_sent_at: new Date().toISOString() })
    .eq("id", user.id)
    .is("welcome_email_sent_at", null)
    .select("id");
  if (error || !data?.length) return;

  const appUrl = getAppUrl();
  try {
    const { error: sendError } = await resend.emails.send({
      from: ACCOUNT_FROM_EMAIL,
      to: user.email,
      subject: "Welcome to Chasry",
      react: WelcomeEmail({ appUrl }),
    });
    // Resend reports failures via the return value, not by throwing.
    if (sendError) throw new Error(sendError.message);
    await logEmailSend(supabase, { userId: user.id, kind: "welcome" });
  } catch (err) {
    console.error("sendWelcomeEmail: send failed", err);
  }
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
