"use server";

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { profileSchema } from "@/lib/validations/profile";

export type OnboardingState = { error?: string } | null;

export async function completeOnboarding(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const t = await getTranslations("validation");
  const tErrors = await getTranslations("onboarding.errors");

  const parsed = profileSchema(t)
    .pick({ business_name: true, currency: true })
    .safeParse({
      business_name: formData.get("business_name"),
      currency: formData.get("currency"),
    });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? t("invalidInput") };

  // requireUser also applies the suspension gate, like every other action.
  const { supabase, user } = await requireUser();

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ ...parsed.data, onboarded_at: new Date().toISOString() })
    .eq("id", user.id);

  if (updateError) return { error: tErrors("saveFailed") };

  redirect("/dashboard");
}
