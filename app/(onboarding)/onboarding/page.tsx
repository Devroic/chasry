import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

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

  return (
    <>
      <h1 className="text-2xl font-semibold text-foreground">Set up your account</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        A couple of details and you&rsquo;re in — free to use, no card required.
      </p>
      <OnboardingForm defaultBusinessName={profile?.business_name ?? ""} />
    </>
  );
}
