import { requireOnboardedUser } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { ProfileForm } from "./profile-form";
import { DangerZone } from "./danger-zone";

export const metadata = { title: "Profile" };

export default async function ProfileSettingsPage() {
  const { profile } = await requireOnboardedUser();

  return (
    <div className="space-y-8">
      <Card>
        <CardContent>
          <ProfileForm
            defaultValues={{
              business_name: profile.business_name ?? "",
              currency: profile.currency,
              payment_link: profile.payment_link ?? "",
              reminder_locale: profile.reminder_locale,
            }}
            email={profile.email}
          />
        </CardContent>
      </Card>

      <DangerZone />
    </div>
  );
}
