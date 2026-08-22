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
