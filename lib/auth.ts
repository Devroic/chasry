import "server-only";
import { cache } from "react";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

/**
 * The underlying auth + profile lookups, deduplicated per request with
 * React.cache(). Without this, every page under app/(dashboard) re-running
 * requireUser()/requireOnboardedUser() — on top of the layout doing the same
 * — was issuing a fresh supabase.auth.getUser() and a fresh `profiles`
 * query on every single page load.
 */
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
      "id, business_name, email, currency, payment_link, subscription_status, current_period_end, stripe_customer_id, stripe_subscription_id, onboarded_at"
    )
    .eq("id", userId)
    .single();
  return data;
});

/**
 * Auth lookup that returns `null` instead of redirecting — for pages that are
 * reachable both logged in and logged out and need to render differently
 * (currently just `/help`, which shows the full dashboard chrome to a signed-in
 * user and the slim marketing header to everyone else). Shares the same
 * per-request cache as `requireUser()`, so using both costs one auth call.
 */
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

/**
 * Auth + "finished onboarding" check, for pages that need the business
 * profile to exist (dashboard). There's no subscription gate here — free
 * and Pro accounts both get full access; only the number of active
 * invoices differs (see lib/plan.ts). A subscription lapsing to 'canceled'
 * just drops someone back to free-plan limits, it never locks them out.
 */
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

/**
 * Gates the internal /admin section. 404s instead of redirecting for a
 * non-admin, so a logged-in subscriber probing the URL doesn't even learn
 * the section exists. Admin pages still need to reach for the service-role
 * client (lib/supabase/admin.ts) separately for any query that spans other
 * users' data — the RLS-scoped client returned here only ever sees the
 * admin's own row, same as any other user.
 */
export async function requireAdmin() {
  const { supabase, user } = await requireUser();
  if (!isAdminEmail(user.email)) notFound();
  return { supabase, user };
}
