import "server-only";
import { stripe } from "@/lib/stripe";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * Creates a Stripe Checkout session for the single Chasry Pro plan. No
 * trial here — the free plan already lets people use the product before
 * paying, so Pro just starts billing immediately on upgrade.
 */
export async function createCheckoutSession({
  userId,
  email,
  stripeCustomerId,
  successPath = "/dashboard?upgraded=1",
  cancelPath = "/settings/billing",
}: {
  userId: string;
  email: string;
  stripeCustomerId: string | null;
  successPath?: string;
  cancelPath?: string;
}) {
  return stripe.checkout.sessions.create({
    mode: "subscription",
    client_reference_id: userId,
    customer: stripeCustomerId ?? undefined,
    customer_email: stripeCustomerId ? undefined : email,
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${appUrl}${successPath}`,
    cancel_url: `${appUrl}${cancelPath}`,
  });
}

/**
 * What the *next* invoice will actually charge, not just when the current
 * billing period ends. These are two different questions once a discount is
 * involved: a coupon changes the amount due, never the monthly cycle itself,
 * so `current_period_end` alone (what we already store from the webhook) is
 * true but easy to misread as "you'll be charged on this date" even during a
 * fully comped month. Returns `null` rather than throwing on any Stripe
 * error (a subscription mid-cancellation has no upcoming invoice to preview,
 * for one), so a call site can always fall back to the plain period-end date.
 */
export async function getUpcomingInvoicePreview(subscriptionId: string) {
  try {
    const upcoming = await stripe.invoices.createPreview({ subscription: subscriptionId });
    return {
      amountDue: upcoming.amount_due / 100,
      currency: upcoming.currency.toUpperCase(),
      periodEnd: new Date(upcoming.period_end * 1000).toISOString(),
    };
  } catch {
    return null;
  }
}
