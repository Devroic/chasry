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

// Admins default to Pro, with a cookie toggle to simulate Free; never written to the database.
export async function getAdminPlanOverride(): Promise<"free" | "pro"> {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_PLAN_OVERRIDE_COOKIE)?.value === "free" ? "free" : "pro";
}

// React.cache() dedupes per request, so nested requireUser() calls share one getUser().
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
      "id, business_name, email, currency, payment_link, reminder_locale, subscription_status, current_period_end, cancel_at_period_end, stripe_customer_id, stripe_subscription_id, onboarded_at, digest_enabled, suspended_at, reminder_schedule_reviewed"
    )
    .eq("id", userId)
    .single();

  if (data && isAdminEmail(data.email)) {
    const view = await getAdminPlanOverride();
    return { ...data, subscription_status: (view === "free" ? "none" : "active") as SubscriptionStatus };
  }

  return data;
});

// Returns null instead of redirecting, for pages reachable logged in or out; shares the cache.
export async function getOptionalUser() {
  const { user } = await getAuthedUser();
  return user;
}

/** Auth check shared by every (dashboard) page: redirects to /login if unauthenticated. */
export async function requireUser() {
  const { supabase, user } = await getAuthedUser();
  if (!user) redirect("/login");
  // Suspension gates pages AND actions (directly callable); getProfile() is request-cached.
  const profile = await getProfile(user.id);
  if (profile?.suspended_at) redirect("/suspended");
  return { supabase, user };
}

// Auth + onboarding check. No subscription gate: only active-invoice count differs by plan.
export async function requireOnboardedUser() {
  const { supabase, user } = await requireUser();
  const profile = await getProfile(user.id);

  // A live session with no readable profile would loop through /login; sign out first instead.
  if (!profile) redirect("/auth/reset-session");
  if (!profile.onboarded_at) redirect("/onboarding");

  return { supabase, user, profile };
}

/** Pure check, no auth call — for conditionally showing an "Admin" link in the UI. */
export function isAdminEmail(email: string | null | undefined) {
  return Boolean(email && ADMIN_EMAILS.includes(email.toLowerCase()));
}

// Gates /admin. 404s (not redirects) for non-admins, so probing doesn't confirm the section exists.
export async function requireAdmin() {
  const { supabase, user } = await requireUser();
  if (!isAdminEmail(user.email)) notFound();
  return { supabase, user };
}
