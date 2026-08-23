"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { profileSchema } from "@/lib/validations/profile";

export type OnboardingState = { error?: string } | null;

export async function completeOnboarding(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const parsed = profileSchema.safeParse({
    business_name: formData.get("business_name"),
    currency: formData.get("currency"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ ...parsed.data, onboarded_at: new Date().toISOString() })
    .eq("id", user!.id);

  if (updateError) return { error: "Couldn't save your details. Try again." };

  redirect("/dashboard");
}
