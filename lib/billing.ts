import { getAppUrl } from "@/lib/constants";
import "server-only";
import { stripe } from "@/lib/stripe";

const appUrl = getAppUrl();

/** Creates the Pro Checkout session. No trial: the free plan is the try-before-paying path. */
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

/** Clamps month-end like Stripe (Jan 31 bills Feb 28); bare setUTCMonth would overflow past renewal. */
function addMonthsClamped(ms: number, months: number): Date {
  const d = new Date(ms);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const daysInTarget = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, daysInTarget));
  return d;
}

/** Date real money next changes hands; a coupon or balance credit can push past the cycle boundary. */
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

    // Discount coverage excludes its end date; with no discount the upcoming invoice is balance-covered.
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
        return addMonthsClamped(baseSeconds * 1000, extraMonths + (hasDiscount ? 0 : 1)).toISOString();
      }
      if (!hasDiscount) {
        // Credit didn't stretch past this invoice; the next cycle is the first real charge.
        return addMonthsClamped(baseSeconds * 1000, 1).toISOString();
      }
    }

    if (!hasDiscount) return null;
    return new Date(baseSeconds * 1000).toISOString();
  } catch {
    return null;
  }
}

// Real revenue in/out only (no fees/payouts); `reporting_category` collapses these, `type` doesn't.
const REVENUE_REPORTING_CATEGORIES = new Set([
  "charge",
  "refund",
  "refund_failure",
  "dispute",
  "dispute_reversal",
]);

/** Lifetime net revenue in cents from Stripe balance history; refunds subtracted, not fee-adjusted. */
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
