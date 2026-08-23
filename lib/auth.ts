import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
      "id, business_name, email, currency, payment_link, subscription_status, current_period_end, stripe_customer_id, onboarded_at"
    )
    .eq("id", userId)
    .single();
  return data;
});

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
