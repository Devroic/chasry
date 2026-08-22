import "server-only";
import Stripe from "stripe";

// No explicit apiVersion: the SDK pins the version it was built against,
// which is the safest default unless you have a specific reason to override it.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
});
