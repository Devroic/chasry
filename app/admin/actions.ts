"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { requireAdmin, ADMIN_PLAN_OVERRIDE_COOKIE } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { linkStripeCustomerSchema } from "@/lib/validations/admin";

/** Flips the admin's own simulated Free/Pro view, see getAdminPlanOverride in lib/auth.ts. */
export async function setAdminPlanOverride(view: "free" | "pro") {
  await requireAdmin();
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_PLAN_OVERRIDE_COOKIE, view, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}

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

  const t = await getTranslations("validation");
  const tForm = await getTranslations("admin.linkForm");

  const parsed = linkStripeCustomerSchema(t).safeParse({
    userId: formData.get("userId"),
    stripeCustomerId: formData.get("stripeCustomerId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? tForm("invalidInput") };
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

  if (error) return { error: tForm("genericError") };
  if (!data.length) return { error: tForm("alreadyLinkedError") };

  revalidatePath(`/admin/users/${parsed.data.userId}`);
  return { success: tForm("successMessage") };
}
