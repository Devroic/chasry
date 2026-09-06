"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { getAppUrl } from "@/lib/constants";
import { requireUser } from "@/lib/auth";
import { profileSchema } from "@/lib/validations/profile";
import { stripe } from "@/lib/stripe";

export type ProfileFormState = {
  error?: string;
  success?: string;
  description?: string;
  emailPending?: boolean;
} | null;

export async function updateProfile(
  _prev: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const t = await getTranslations("validation");
  const tCommon = await getTranslations("common");
  const tProfile = await getTranslations("settings.profile");
  const tSec = await getTranslations("settings.profile.security");

  const parsed = profileSchema(t).safeParse({
    business_name: formData.get("business_name"),
    currency: formData.get("currency"),
    email: formData.get("email"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? t("invalidInput") };

  const { supabase, user } = await requireUser();
  const { business_name, currency, email } = parsed.data;

  const { error } = await supabase
    .from("profiles")
    .update({ business_name, currency })
    .eq("id", user.id);
  if (error) return { error: tCommon("saveFailed") };

  // Email is not written to profiles directly: Supabase confirms it from the new
  // address first, then the on_auth_email_change trigger syncs profiles.email.
  const newEmail = email.toLowerCase();
  if (newEmail !== (user.email ?? "").toLowerCase()) {
    const { error: emailError } = await supabase.auth.updateUser(
      { email: newEmail },
      { emailRedirectTo: `${getAppUrl()}/auth/confirm?next=/settings/profile` }
    );
    if (emailError) {
      if (emailError.code === "email_exists" || /already|in use|registered/i.test(emailError.message)) {
        return { error: tSec("emailInUse") };
      }
      if (emailError.code === "over_email_send_rate_limit") return { error: tSec("emailRateLimited") };
      return { error: tSec("emailFailed") };
    }
    revalidatePath("/settings/profile");
    return {
      success: tSec("emailChangeSentTitle"),
      description: tSec("emailChangeSentDescription", { email: newEmail }),
      emailPending: true,
    };
  }

  revalidatePath("/settings/profile");
  return { success: tProfile("savedTitle"), description: tProfile("savedDescription") };
}

export async function deleteAccount(): Promise<{ error: string } | void> {
  const { supabase, user } = await requireUser();
  const tDanger = await getTranslations("settings.dangerZone");

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  // Delete the Stripe customer, which also cancels any active subscription. If this
  // fails we stop before deleting the account, so we never leave Stripe billing a
  // customer that no longer has an account to manage it.
  if (profile?.stripe_customer_id) {
    try {
      await stripe.customers.del(profile.stripe_customer_id);
    } catch (err) {
      // A customer that's already gone is fine; any other failure blocks deletion.
      if ((err as { code?: string })?.code !== "resource_missing") {
        console.error("deleteAccount: failed to delete Stripe customer", err);
        return { error: tDanger("stripeFailed") };
      }
    }
  }

  const { error } = await supabase.rpc("delete_account");
  if (error) {
    console.error("deleteAccount: delete_account RPC failed", error);
    return { error: tDanger("deleteFailed") };
  }

  await supabase.auth.signOut();
  redirect("/login");
}
