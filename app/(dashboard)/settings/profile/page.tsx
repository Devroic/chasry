import { requireOnboardedUser } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { ProfileForm } from "./profile-form";
import { DangerZone } from "./danger-zone";

export default async function ProfileSettingsPage() {
  const { profile } = await requireOnboardedUser();

  return (
    <div className="space-y-8">
      <Card>
        <CardContent className="pt-6">
          <ProfileForm
            defaultValues={{
              business_name: profile.business_name ?? "",
              timezone: profile.timezone,
              currency: profile.currency,
              payment_link: profile.payment_link ?? "",
            }}
            email={profile.email}
          />
        </CardContent>
      </Card>

      <DangerZone />
    </div>
  );
}
