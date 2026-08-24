import { z } from "zod";

/**
 * A plain (non-factory) schema, unlike every customer-facing form's schema
 * in lib/validations/*.ts. The /admin section is deliberately English-only,
 * it's a single-operator internal tool, not part of the product a
 * subscriber ever sees, so there's no Translator to thread through here.
 */
export const linkStripeCustomerSchema = z.object({
  userId: z.string().uuid(),
  stripeCustomerId: z
    .string()
    .trim()
    .regex(/^cus_[A-Za-z0-9]+$/, "Must look like a Stripe customer ID, e.g. cus_ABC123."),
});

export type LinkStripeCustomerInput = z.infer<typeof linkStripeCustomerSchema>;
