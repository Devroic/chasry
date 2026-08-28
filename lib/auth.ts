import "server-only";
import { cache } from "react";
import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { SubscriptionStatus } from "@/types/database.types";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export const ADMIN_PLAN_OVERRIDE_COOKIE = "chasry_admin_plan_view";

// Admin accounts default to Pro (so the free-plan cap doesn't get in the way of testing),
// with a toggle to simulate Free. Never written to the database, only overrides getProfile().
export async function getAdminPlanOverride(): Promise<"free" | "pro"> {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_PLAN_OVERRIDE_COOKIE)?.value === "free" ? "free" : "pro";
}

// Deduplicated per request with React.cache() — without it, every page's own
// requireUser() call issued a fresh supabase.auth.getUser().
const getAuthedUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
});

export const getProfile = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select(
      "id, business_name, email, currency, payment_link, subscription_status, current_period_end, cancel_at_period_end, stripe_customer_id, stripe_subscription_id, onboarded_at"
    )
    .eq("id", userId)
    .single();

  if (data && isAdminEmail(data.email)) {
    const view = await getAdminPlanOverride();
    return { ...data, subscription_status: (view === "free" ? "none" : "active") as SubscriptionStatus };
  }

  return data;
});

// Returns `null` instead of redirecting — for pages reachable both logged in and out
// (currently just /help). Shares requireUser()'s per-request cache.
export async function getOptionalUser() {
  const { user } = await getAuthedUser();
  return user;
}

/** Auth check shared by every (dashboard) page: redirects to /login if unauthenticated. */
export async function requireUser() {
  const { supabase, user } = await getAuthedUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

// Auth + "finished onboarding" check. No subscription gate — free and Pro both get
// full access, only active-invoice count differs (lib/plan.ts).
export async function requireOnboardedUser() {
  const { supabase, user } = await requireUser();
  const profile = await getProfile(user.id);

  if (!profile) redirect("/login");
  if (!profile.onboarded_at) redirect("/onboarding");

  return { supabase, user, profile };
}

/** Pure check, no auth call — for conditionally showing an "Admin" link in the UI. */
export function isAdminEmail(email: string | null | undefined) {
  return Boolean(email && ADMIN_EMAILS.includes(email.toLowerCase()));
}

// Gates /admin. 404s (not redirects) for a non-admin, so probing the URL doesn't
// confirm the section exists. Cross-user queries still need the service-role client separately.
export async function requireAdmin() {
  const { supabase, user } = await requireUser();
  if (!isAdminEmail(user.email)) notFound();
  return { supabase, user };
}
