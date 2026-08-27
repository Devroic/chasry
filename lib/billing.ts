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
 * boundary. Those are the same date for an undiscounted, uncredited
 * subscription, but two separate mechanisms can push a real charge further
 * out without ever changing the monthly cycle itself: a coupon (a
 * `repeating`-duration discount has a real `end` date, computed by Stripe)
 * and a customer balance credit (a flat amount that gets consumed by
 * whichever invoice comes due next, however far out that is — see
 * `settings/billing`'s admin notes on gifting a subscription). Both were
 * used together on the account this was built against: a 3-month coupon,
 * then a €10 balance credit added afterward to cover one more month on top.
 *
 * Resolution: preview the next invoice. If it's already a real charge,
 * that invoice's date is correct as-is. If it's €0, find how far the
 * coupon pushes things out (its Stripe-computed `end`, or the immediate
 * next invoice's own date if there's no coupon at all — balance alone is
 * covering it), then add however many further consecutive monthly invoices
 * the remaining balance credit is large enough to zero out on top of that.
 * A `forever`-duration coupon with no balance behind it has no computable
 * end at all (by design, nothing is ever going to be charged), so that
 * case returns `null` rather than a fabricated date.
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

    // Discount coverage is exclusive of its end date (the invoice *at* that
    // timestamp is the first one not covered), so that's a clean base to
    // layer balance-covered months on top of. With no discount at all, the
    // immediate upcoming invoice is itself already balance-covered — one
    // month's worth of credit is already spoken for by it.
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
        // No discount, and the credit didn't stretch past this one invoice —
        // it's already covered above by the amount_due === 0 branch, so the
        // next one after it (one more cycle) is the first real charge.
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

/**
 * Total gross amount ever collected across every subscriber, for the admin
 * Overview page. Nothing in the database tracks historical payment amounts
 * (profiles only stores the current subscription state), so this is summed
 * directly from Stripe's own balance transaction history instead of a
 * running total kept locally. Only successful charges are summed, refunds
 * and disputes are not subtracted back out, this account hasn't had any,
 * and this is meant as a simple lifetime-total figure rather than a
 * reconciled ledger. Returned in cents, matching Stripe's own convention.
 */
export async function getLifetimeRevenueCents(): Promise<number | null> {
  try {
    let totalCents = 0;
    for await (const txn of stripe.balanceTransactions.list({ type: "charge", limit: 100 })) {
      totalCents += txn.amount;
    }
    return totalCents;
  } catch {
    return null;
  }
}
