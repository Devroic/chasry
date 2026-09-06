import { getTranslations } from "next-intl/server";
import { requireOnboardedUser } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { BackLink } from "@/components/back-link";
import { ChangePasswordForm } from "./change-password-form";

export const metadata = { title: "Password" };

export default async function PasswordSettingsPage() {
  await requireOnboardedUser();
  const t = await getTranslations("settings.profile.security");

  return (
    <div className="space-y-4">
      <BackLink href="/settings/profile" label={t("backToProfile")} />
      <Card>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
