"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { profileSchema } from "@/lib/validations/profile";
import { stripe } from "@/lib/stripe";

export type ProfileFormState = { error?: string; success?: string; description?: string } | null;

export async function updateProfile(
  _prev: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const parsed = profileSchema.safeParse({
    business_name: formData.get("business_name"),
    currency: formData.get("currency"),
    payment_link: formData.get("payment_link"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) return { error: "Couldn't save changes. Try again." };

  revalidatePath("/settings/profile");
  return { success: "Profile saved", description: "Your business details are up to date." };
}

export async function deleteAccount() {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_subscription_id")
    .eq("id", user.id)
    .single();

  if (profile?.stripe_subscription_id) {
    try {
      await stripe.subscriptions.cancel(profile.stripe_subscription_id);
    } catch (err) {
      // Already canceled or gone — fine to continue with account deletion either way.
      console.error("deleteAccount: failed to cancel Stripe subscription", err);
    }
  }

  await supabase.rpc("delete_account");
  await supabase.auth.signOut();
  redirect("/login");
}
