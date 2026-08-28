import { NextResponse } from "next/server";
import type Stripe from "stripe";
import * as Sentry from "@sentry/nextjs";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend, ACCOUNT_FROM_EMAIL } from "@/lib/resend";
import UpgradedToProEmail from "@/emails/upgraded-to-pro";
import SubscriptionCanceledEmail from "@/emails/subscription-canceled";
import { formatDate } from "@/lib/format";
import type { SubscriptionStatus } from "@/types/database.types";

export const dynamic = "force-dynamic";

const DIRECTLY_MAPPED_STATUSES: SubscriptionStatus[] = ["active", "past_due", "canceled"];

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  if ((DIRECTLY_MAPPED_STATUSES as string[]).includes(status)) {
    return status as SubscriptionStatus;
  }
  // incomplete, incomplete_expired, unpaid, paused, trialing (unused — no
  // Pro trial), or any future status: never grant Pro for a subscription
  // that hasn't actually gone active. Falls back to the free plan.
  return "none";
}

async function syncSubscription(subscription: Stripe.Subscription): Promise<SubscriptionStatus> {
  const supabase = createAdminClient();
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

  const currentPeriodEnd = subscription.items.data[0]?.current_period_end;
  const status = mapStripeStatus(subscription.status);
  // The customer portal's "cancel at period end" flow schedules the
  // cancellation by setting `cancel_at` to a timestamp and leaving
  // `cancel_at_period_end` false, not by flipping the boolean, at least on
  // this account's Stripe API version. Both fields mean the same thing here
  // (subscription set to end rather than renew), so either signals it.
  const cancelAtPeriodEnd = subscription.cancel_at_period_end || subscription.cancel_at != null;
  const scheduledEndSeconds = subscription.cancel_at ?? currentPeriodEnd;

  // Read the prior cancel_at_period_end before overwriting it, that's the
  // only way to tell "just scheduled a cancellation" (false -> true) apart
  // from every other reason this event fires (renewal, past_due, someone
  // resubscribing before their period ends), which would otherwise resend
  // the cancellation email on every later sync too.
  const { data: existing } = await supabase
    .from("profiles")
    .select("email, cancel_at_period_end")
    .eq("stripe_customer_id", customerId)
    .single();

  const { error } = await supabase
    .from("profiles")
    .update({
      stripe_subscription_id: subscription.id,
      subscription_status: status,
      current_period_end: currentPeriodEnd
        ? new Date(currentPeriodEnd * 1000).toISOString()
        : null,
      cancel_at_period_end: cancelAtPeriodEnd,
    })
    .eq("stripe_customer_id", customerId);

  if (error) {
    console.error("stripe/webhook: failed to sync subscription", error);
    // Highest-consequence failure in the app: Stripe took the money but the
    // profile never flipped to Pro, so the user is charged and still capped.
    Sentry.captureException(error, {
      level: "fatal",
      tags: { integration: "stripe", stage: "sync-subscription" },
      extra: { customerId, subscriptionId: subscription.id },
    });
    throw error;
  }

  const justScheduledCancellation =
    status === "active" && cancelAtPeriodEnd && !existing?.cancel_at_period_end;
  if (justScheduledCancellation && existing?.email && scheduledEndSeconds) {
    await sendSubscriptionCanceledEmail(
      existing.email,
      new Date(scheduledEndSeconds * 1000).toISOString()
    );
  }

  return status;
}

/**
 * Only called from checkout.session.completed, the one event that
 * represents someone actually just becoming Pro for the first time (the
 * promo-code-at-checkout flow, per STRIPE-PLAYBOOK.md's policy). Not called
 * from the general customer.subscription.updated sync path, that fires for
 * every later renewal, past_due transition, or unrelated change too, and
 * would otherwise re-send this on every one of those. Best-effort: a failed
 * send here shouldn't fail the webhook, Stripe already has the money and
 * the profile already synced by this point.
 */
async function sendUpgradedToProEmail(email: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  try {
    await resend.emails.send({
      from: ACCOUNT_FROM_EMAIL,
      to: email,
      subject: "You're on Chasry Pro",
      react: UpgradedToProEmail({ appUrl }),
    });
  } catch (err) {
    console.error("stripe/webhook: upgraded-to-pro email failed", err);
  }
}

/**
 * Fires the moment cancel_at_period_end flips to true in syncSubscription,
 * not when the subscription is actually deleted at period end, that could be
 * weeks away and the person who just clicked "cancel" wants confirmation now.
 * Best-effort, same as sendUpgradedToProEmail.
 */
async function sendSubscriptionCanceledEmail(email: string, periodEndIso: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  try {
    await resend.emails.send({
      from: ACCOUNT_FROM_EMAIL,
      to: email,
      subject: "Your Chasry Pro subscription is canceled",
      react: SubscriptionCanceledEmail({ appUrl, accessUntil: formatDate(periodEndIso) }),
    });
  } catch (err) {
    console.error("stripe/webhook: subscription-canceled email failed", err);
  }
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // These two look alike but mean opposite things, so they're split.
  //
  // No `stripe-signature` header = almost always a bot probing the endpoint.
  // Not reported: it's noise, and Stripe always sends the header.
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // A missing secret is *our* misconfiguration, and a total billing outage:
  // every webhook 400s, so nobody who pays is ever upgraded. This used to
  // share the branch above and was reported nowhere — the deploy would look
  // healthy while silently dropping every payment event.
  if (!webhookSecret) {
    Sentry.captureException(new Error("STRIPE_WEBHOOK_SECRET is not set, so all Stripe webhooks are being rejected"), {
      level: "fatal",
      tags: { integration: "stripe", stage: "config" },
    });
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("stripe/webhook: signature verification failed", err);
    // `error`, not `warning`, so it actually reaches the inbox — the default
    // Sentry alert only emails on *high priority* issues, and warnings don't
    // qualify. Reaching here means a `stripe-signature` header was present
    // (the probe case already returned above), so this is either a stale
    // STRIPE_WEBHOOK_SECRET — every payment silently failing to upgrade — or
    // someone forging Stripe signatures. Both are worth being woken up for.
    Sentry.captureException(err, {
      level: "error",
      tags: { integration: "stripe", stage: "verify-signature" },
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id;
        const customerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id;

        let subscriberEmail: string | null = null;

        if (userId && customerId) {
          const supabase = createAdminClient();
          const { data, error } = await supabase
            .from("profiles")
            .update({ stripe_customer_id: customerId })
            .eq("id", userId)
            .select("email")
            .single();
          if (error) throw error;
          subscriberEmail = data?.email ?? null;
        }

        if (session.subscription) {
          const subscriptionId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const status = await syncSubscription(subscription);

          if (subscriberEmail && status === "active") {
            await sendUpgradedToProEmail(subscriberEmail);
          }
        }
        break;
      }

      // Covers trial start, plan changes, past_due transitions, etc. — the
      // single source of truth for subscription_status after the initial checkout.
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;
        const supabase = createAdminClient();
        const { error } = await supabase
          .from("profiles")
          .update({ subscription_status: "canceled" })
          .eq("stripe_customer_id", customerId);
        if (error) throw error;
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("stripe/webhook: handler failed", { type: event.type, err });
    Sentry.captureException(err, {
      level: "fatal",
      tags: { integration: "stripe", stage: "handle-event" },
      extra: { eventType: event.type, eventId: event.id },
    });
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
