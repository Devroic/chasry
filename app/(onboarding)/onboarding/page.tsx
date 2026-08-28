import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export const metadata = { title: "Set up your account" };

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_name, onboarded_at")
    .eq("id", user.id)
    .single();

  if (profile?.onboarded_at) redirect("/dashboard");

  const t = await getTranslations("onboarding");

  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{t("title")}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{t("subtitle")}</p>
      <OnboardingForm defaultBusinessName={profile?.business_name ?? ""} />
    </>
  );
}
