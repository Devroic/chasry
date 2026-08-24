"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { linkStripeCustomerSchema } from "@/lib/validations/admin";

export type LinkStripeCustomerState = { error?: string; success?: string } | null;

/**
 * The manual fallback for gifting a subscription to someone who's never
 * checked out before, see STRIPE-PLAYBOOK.md. The webhook only matches an
 * incoming Stripe event back to a Chasry account via profiles.stripe_customer_id,
 * so this has to be set *before* a subscription is created for that customer
 * in Stripe, or the sync silently matches nothing.
 */
export async function linkStripeCustomer(
  _prev: LinkStripeCustomerState,
  formData: FormData
): Promise<LinkStripeCustomerState> {
  await requireAdmin();

  const parsed = linkStripeCustomerSchema.safeParse({
    userId: formData.get("userId"),
    stripeCustomerId: formData.get("stripeCustomerId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = createAdminClient();
  // Mirrors the UI's own invariant (the form only renders when unset) at the
  // Server Action layer too, not just the page, per this app's rule that
  // every action re-checks its own conditions rather than trust a page guard.
  // Without .is(), a stale form resubmission or a second linking attempt
  // would silently overwrite an already-correct link, orphaning that user's
  // real Stripe customer from the webhook (it matches on this column).
  const { data, error } = await supabase
    .from("profiles")
    .update({ stripe_customer_id: parsed.data.stripeCustomerId })
    .eq("id", parsed.data.userId)
    .is("stripe_customer_id", null)
    .select("id");

  if (error) return { error: "Couldn't save that, try again." };
  if (!data.length) {
    return { error: "No unlinked user found with that ID, it may already have a Stripe customer linked." };
  }

  revalidatePath(`/admin/users/${parsed.data.userId}`);
  return { success: "Stripe customer linked." };
}
