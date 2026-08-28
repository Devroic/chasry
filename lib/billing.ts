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
 * The date real money next changes hands, not just the billing-cycle
 * boundary — a coupon or balance credit can push it out further. Previews
 * the next invoice and, if it's €0, walks forward through discount coverage
 * plus balance-covered months to find the first real charge.
 */
export async function getNextRealPaymentDate(subscriptionId: string): Promise<string | null> {
  try {
    const upcoming = await stripe.invoices.createPreview({ subscription: subscriptionId });
    if (upcoming.amount_due > 0) {
      return new Date(upcoming.period_end * 1000).toISOString();
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["discounts", "customer"],
    });
    const discountEnds = (subscription.discounts ?? [])
      .map((d) => (typeof d === "string" ? null : d.end))
      .filter((end): end is number => end != null);

    // Discount coverage excludes its end date; with no discount, the
    // upcoming invoice is itself already balance-covered.
    const hasDiscount = discountEnds.length > 0;
    const baseSeconds = hasDiscount ? Math.max(...discountEnds) : upcoming.period_end;

    const customer = subscription.customer;
    const priceCents = subscription.items.data[0]?.price.unit_amount ?? 0;
    if (customer && typeof customer !== "string" && !customer.deleted && priceCents > 0) {
      // Stripe stores a credit as a negative balance.
      const creditCents = Math.max(0, -customer.balance);
      const consumedByThisInvoice = hasDiscount ? 0 : priceCents;
      const extraMonths = Math.floor((creditCents - consumedByThisInvoice) / priceCents);
      if (extraMonths > 0) {
        const covered = new Date(baseSeconds * 1000);
        covered.setUTCMonth(covered.getUTCMonth() + extraMonths + (hasDiscount ? 0 : 1));
        return covered.toISOString();
      }
      if (!hasDiscount) {
        // Credit didn't stretch past this invoice — the next cycle is the
        // first real charge.
        const nextCycle = new Date(baseSeconds * 1000);
        nextCycle.setUTCMonth(nextCycle.getUTCMonth() + 1);
        return nextCycle.toISOString();
      }
    }

    if (!hasDiscount) return null;
    return new Date(baseSeconds * 1000).toISOString();
  } catch {
    return null;
  }
}

// Categories representing real revenue in/out; excludes fees, payouts,
// transfers, etc. `reporting_category` collapses these cleanly, `type` doesn't.
const REVENUE_REPORTING_CATEGORIES = new Set([
  "charge",
  "refund",
  "refund_failure",
  "dispute",
  "dispute_reversal",
]);

/**
 * Lifetime net revenue across all subscribers, summed from Stripe's balance
 * transaction history since nothing local tracks historical payments. Cents,
 * refunds/disputes already subtracted, not fee-adjusted.
 */
export async function getLifetimeRevenueCents(): Promise<number | null> {
  try {
    let totalCents = 0;
    for await (const txn of stripe.balanceTransactions.list({ limit: 100 })) {
      if (REVENUE_REPORTING_CATEGORIES.has(txn.reporting_category)) {
        totalCents += txn.amount;
      }
    }
    return totalCents;
  } catch {
    return null;
  }
}
