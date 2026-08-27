"use server";

import { redirect } from "next/navigation";
import { stripe } from "@/lib/stripe";
import { createCheckoutSession } from "@/lib/billing";
import { requireUser } from "@/lib/auth";
import { isPro } from "@/lib/plan";

export async function startCheckout() {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, email, subscription_status")
    .eq("id", user.id)
    .single();

  // Someone already on Pro must never reach Checkout again: Stripe would
  // happily create a *second* subscription on the same customer and bill
  // them twice. The UI already hides the upgrade button for them, but a
  // stale tab, a double submit, or an admin viewing the app in simulated
  // Free mode (see getAdminPlanOverride in lib/auth.ts) can all still get
  // here, so this is the real gate. Reads subscription_status straight from
  // the row rather than through getProfile(), deliberately: getProfile()
  // applies the admin plan override, which would make this check pass for
  // exactly the case it exists to catch. past_due counts as Pro here too,
  // they need the portal to fix their card, not a duplicate subscription.
  if (isPro(profile?.subscription_status ?? "none")) redirect("/settings/billing");

  const session = await createCheckoutSession({
    userId: user.id,
    email: profile?.email ?? user.email ?? "",
    stripeCustomerId: profile?.stripe_customer_id ?? null,
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  redirect(session.url);
}

export async function openBillingPortal() {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_customer_id) redirect("/settings/billing");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${appUrl}/settings/billing`,
  });

  redirect(session.url);
}
