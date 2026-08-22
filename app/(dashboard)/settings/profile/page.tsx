import { requireUser } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { ProfileForm } from "./profile-form";
import { DangerZone } from "./danger-zone";

export default async function ProfileSettingsPage() {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_name, timezone, currency, email")
    .eq("id", user.id)
    .single();

  return (
    <div className="space-y-8">
      <Card>
        <CardContent className="pt-6">
          <ProfileForm
            defaultValues={{
              business_name: profile?.business_name ?? "",
              timezone: profile?.timezone ?? "UTC",
              currency: profile?.currency ?? "EUR",
            }}
            email={profile?.email ?? user.email ?? ""}
          />
        </CardContent>
      </Card>

      <DangerZone />
    </div>
  );
}
