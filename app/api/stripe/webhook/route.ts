import { NextResponse } from "next/server";
import type Stripe from "stripe";
import * as Sentry from "@sentry/nextjs";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
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

async function syncSubscription(subscription: Stripe.Subscription) {
  const supabase = createAdminClient();
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

  const currentPeriodEnd = subscription.items.data[0]?.current_period_end;

  const { error } = await supabase
    .from("profiles")
    .update({
      stripe_subscription_id: subscription.id,
      subscription_status: mapStripeStatus(subscription.status),
      current_period_end: currentPeriodEnd
        ? new Date(currentPeriodEnd * 1000).toISOString()
        : null,
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
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("stripe/webhook: signature verification failed", err);
    // Usually a stale STRIPE_WEBHOOK_SECRET after a redeploy, occasionally
    // someone probing the endpoint. Warning, not error — Stripe retries.
    Sentry.captureException(err, {
      level: "warning",
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

        if (userId && customerId) {
          const supabase = createAdminClient();
          const { error } = await supabase
            .from("profiles")
            .update({ stripe_customer_id: customerId })
            .eq("id", userId);
          if (error) throw error;
        }

        if (session.subscription) {
          const subscriptionId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await syncSubscription(subscription);
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
