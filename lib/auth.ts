import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Auth check shared by every (dashboard) page: redirects to /login if unauthenticated. */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status, onboarded_at, currency, business_name, email")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");
  if (!profile.onboarded_at) redirect("/onboarding");

  return { supabase, user, profile };
}
