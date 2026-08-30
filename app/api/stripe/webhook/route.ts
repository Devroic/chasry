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
  // Any other status never grants Pro — falls back to the free plan.
  return "none";
}

async function syncSubscription(subscription: Stripe.Subscription): Promise<SubscriptionStatus> {
  const supabase = createAdminClient();
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

  const currentPeriodEnd = subscription.items.data[0]?.current_period_end;
  const status = mapStripeStatus(subscription.status);
  // The customer portal schedules cancellation via `cancel_at`, not by flipping
  // `cancel_at_period_end`, at least on this Stripe API version. Either signals it.
  const cancelAtPeriodEnd = subscription.cancel_at_period_end || subscription.cancel_at != null;
  const scheduledEndSeconds = subscription.cancel_at ?? currentPeriodEnd;

  // Read the prior value before overwriting — the only way to tell "just scheduled"
  // (false → true) from every other reason this event fires.
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
 * Only called from checkout.session.completed — someone actually becoming
 * Pro for the first time, not every later renewal sync. Best-effort: a
 * failed send here shouldn't fail the webhook.
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

/** Fires when cancel_at_period_end flips true, not when it's actually deleted weeks later. */
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

  // No signature header = almost always a bot probing the endpoint. Not
  // reported — Stripe always sends the header.
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // A missing secret is our misconfiguration and a total billing outage —
  // every webhook 400s, nobody who pays gets upgraded.
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
    // `error` level, not `warning` — Sentry's default alert only emails on high
    // priority. This means either a stale secret or a forged signature, both worth waking up for.
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
