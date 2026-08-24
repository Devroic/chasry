"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { profileSchema } from "@/lib/validations/profile";
import { stripe } from "@/lib/stripe";

export type ProfileFormState = { error?: string; success?: string; description?: string } | null;

export async function updateProfile(
  _prev: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const t = await getTranslations("validation");
  const tCommon = await getTranslations("common");
  const tProfile = await getTranslations("settings.profile");

  const parsed = profileSchema(t).safeParse({
    business_name: formData.get("business_name"),
    currency: formData.get("currency"),
    payment_link: formData.get("payment_link"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? t("invalidInput") };

  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) return { error: tCommon("saveFailed") };

  revalidatePath("/settings/profile");
  return { success: tProfile("savedTitle"), description: tProfile("savedDescription") };
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
