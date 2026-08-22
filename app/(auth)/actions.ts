"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkAuthRateLimit } from "@/lib/rate-limit";
import { loginSchema, signupSchema, requestResetSchema } from "@/lib/validations/auth";

export type AuthFormState = { error?: string; success?: string } | null;

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function login(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const ip = await clientIp();
  const { success } = await checkAuthRateLimit(`login:${ip}`);
  if (!success) return { error: "Too many attempts. Try again in a minute." };

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "Incorrect email or password." };

  redirect("/dashboard");
}

export async function signup(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const ip = await clientIp();
  const { success } = await checkAuthRateLimit(`signup:${ip}`);
  if (!success) return { error: "Too many attempts. Try again in a minute." };

  const parsed = signupSchema.safeParse({
    business_name: formData.get("business_name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { business_name: parsed.data.business_name } },
  });
  if (error) {
    if (error.message.toLowerCase().includes("already registered")) {
      return { error: "An account with that email already exists." };
    }
    return { error: "Couldn't create your account. Please try again." };
  }

  if (data.user) {
    await supabase
      .from("profiles")
      .update({ business_name: parsed.data.business_name })
      .eq("id", data.user.id);
  }

  // Email confirmation required (Supabase default) → session isn't active yet.
  if (!data.session) {
    return { success: "Check your email to confirm your account, then log in." };
  }

  redirect("/onboarding");
}

export async function requestPasswordReset(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const ip = await clientIp();
  const { success } = await checkAuthRateLimit(`reset:${ip}`);
  if (!success) return { error: "Too many attempts. Try again in a minute." };

  const parsed = requestResetSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl}/reset-password/confirm`,
  });

  // Always report success, regardless of whether the email exists — avoids
  // leaking which addresses are registered.
  return { success: "If that email has an account, we've sent a reset link." };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
