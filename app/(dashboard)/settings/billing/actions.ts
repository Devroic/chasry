"use server";

import { getAppUrl } from "@/lib/constants";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { stripe } from "@/lib/stripe";
import { createCheckoutSession, getNextRealPaymentDate } from "@/lib/billing";
import { sendSubscriptionCanceledEmail } from "@/lib/subscription-emails";
import { logEmailSend } from "@/lib/email-log";
import { requireUser } from "@/lib/auth";
import { isPro } from "@/lib/plan";

export async function startCheckout() {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, email, subscription_status")
    .eq("id", user.id)
    .single();

  // Real gate against double-subscribing — reads subscription_status directly,
  // not via getProfile(), since that applies the admin plan override.
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

  const appUrl = getAppUrl();
  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${appUrl}/settings/billing`,
  });

  redirect(session.url);
}

/**
 * Schedules the downgrade at the next date real money would change hands. With a coupon
 * or balance credit that's later than the period boundary — canceling there would forfeit
 * the already-covered months, and the downgrade dialog quotes the next-payment date.
 */
export async function cancelSubscription() {
  const { supabase, user } = await requireUser();
  const t = await getTranslations("settings.billing.downgrade");

  // Reads subscription_status directly, not via getProfile(), which applies the
  // admin plan override — only a real Stripe subscription can be canceled.
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, subscription_status, stripe_subscription_id, cancel_at_period_end")
    .eq("id", user.id)
    .single();

  // Returned (not thrown): production masks thrown Server Action messages.
  if (
    !profile?.stripe_subscription_id ||
    profile.subscription_status !== "active" ||
    profile.cancel_at_period_end
  ) {
    return { error: t("failed") };
  }

  const nextChargeIso = await getNextRealPaymentDate(profile.stripe_subscription_id);
  const subscription = nextChargeIso
    ? await stripe.subscriptions.update(profile.stripe_subscription_id, {
        cancel_at: Math.floor(new Date(nextChargeIso).getTime() / 1000),
      })
    : // Lookup failed: the period boundary is the safe default.
      await stripe.subscriptions.update(profile.stripe_subscription_id, {
        cancel_at_period_end: true,
      });

  // Written locally too, so the page reflects it even before the webhook syncs.
  const periodEndSeconds = subscription.cancel_at ?? subscription.items.data[0]?.current_period_end;
  const periodEndIso = periodEndSeconds ? new Date(periodEndSeconds * 1000).toISOString() : null;
  await supabase
    .from("profiles")
    .update({
      cancel_at_period_end: true,
      ...(periodEndIso ? { current_period_end: periodEndIso } : {}),
    })
    .eq("id", user.id);

  // The webhook only emails on a false → true flip it observes, which the local
  // write above already made, so this is the one send.
  if (profile.email && periodEndIso) {
    await sendSubscriptionCanceledEmail(profile.email, periodEndIso);
    await logEmailSend(supabase, { userId: user.id, kind: "canceled" });
  }

  revalidatePath("/settings/billing");
}

/** Undoes a scheduled cancellation, so the subscription renews normally again. */
export async function resumeSubscription() {
  const { supabase, user } = await requireUser();
  const t = await getTranslations("settings.billing.resume");

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status, stripe_subscription_id, cancel_at_period_end")
    .eq("id", user.id)
    .single();

  // Returned (not thrown): production masks thrown Server Action messages.
  if (
    !profile?.stripe_subscription_id ||
    profile.subscription_status !== "active" ||
    !profile.cancel_at_period_end
  ) {
    return { error: t("failed") };
  }

  // Both our in-app cancel and the portal schedule via `cancel_at`; clear whichever is set.
  const current = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
  const updated =
    current.cancel_at != null
      ? await stripe.subscriptions.update(profile.stripe_subscription_id, { cancel_at: "" })
      : await stripe.subscriptions.update(profile.stripe_subscription_id, {
          cancel_at_period_end: false,
        });

  // Restores the real period boundary, which the cancel had overwritten with its end date.
  const periodEndSeconds = updated.items.data[0]?.current_period_end;
  await supabase
    .from("profiles")
    .update({
      cancel_at_period_end: false,
      ...(periodEndSeconds
        ? { current_period_end: new Date(periodEndSeconds * 1000).toISOString() }
        : {}),
    })
    .eq("id", user.id);

  revalidatePath("/settings/billing");
}
