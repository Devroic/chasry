import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProfileForm } from "./profile-form";
import { DangerZone } from "./danger-zone";

export const metadata = { title: "Profile" };

export default async function ProfileSettingsPage() {
  const { profile } = await requireOnboardedUser();
  const t = await getTranslations("settings.profile");

  return (
    <div className="space-y-8">
      <Card>
        <CardContent>
          <ProfileForm
            defaultValues={{
              business_name: profile.business_name ?? "",
              currency: profile.currency,
              email: profile.email,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("security.passwordTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-3">
          <p className="text-sm text-muted-foreground">{t("security.passwordDescription")}</p>
          <Button asChild variant="outline">
            <Link href="/settings/password">{t("security.changePasswordButton")}</Link>
          </Button>
        </CardContent>
      </Card>

      <DangerZone />
    </div>
  );
}
