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
 * The date real money next changes hands, not just the next billing-cycle
 * boundary. Those are the same date for an undiscounted subscription, but
 * not for one on a coupon: the cycle still rolls monthly regardless of any
 * discount, so `current_period_end` alone can show a date that's actually
 * another free month, exactly what happened with a 3-month 100%-off coupon
 * here — the very next cycle boundary was still fully covered.
 *
 * Resolution: preview the next invoice. If it's already a real charge,
 * that invoice's date is correct as-is. If it's €0, the next REAL charge is
 * whenever the active discount stops applying — Stripe computes that end
 * date itself for a `repeating`-duration coupon, so it's read directly
 * rather than re-derived. A `forever`-duration coupon has no such end (by
 * design, nothing is ever going to be charged), so that case returns `null`
 * rather than a fabricated date.
 */
export async function getNextRealPaymentDate(subscriptionId: string): Promise<string | null> {
  try {
    const upcoming = await stripe.invoices.createPreview({ subscription: subscriptionId });
    if (upcoming.amount_due > 0) {
      return new Date(upcoming.period_end * 1000).toISOString();
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["discounts"],
    });
    const discountEnds = (subscription.discounts ?? [])
      .map((d) => (typeof d === "string" ? null : d.end))
      .filter((end): end is number => end != null);
    if (discountEnds.length === 0) return null;

    return new Date(Math.max(...discountEnds) * 1000).toISOString();
  } catch {
    return null;
  }
}
