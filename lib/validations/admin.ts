import { z } from "zod";
import type { Translator } from "./shared";

export function linkStripeCustomerSchema(t: Translator) {
  return z.object({
    userId: z.string().uuid(),
    stripeCustomerId: z
      .string()
      .trim()
      .regex(/^cus_[A-Za-z0-9]+$/, t("stripeCustomerIdInvalid")),
  });
}

export type LinkStripeCustomerInput = z.infer<ReturnType<typeof linkStripeCustomerSchema>>;
