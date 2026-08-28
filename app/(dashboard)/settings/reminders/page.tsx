import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { ReminderSettingsForm } from "./reminder-settings-form";

export const metadata = { title: "Reminders" };

export default async function ReminderSettingsPage() {
  const { supabase, user } = await requireUser();
  const t = await getTranslations("settings.reminders");

  const { data: settings } = await supabase
    .from("reminder_settings")
    .select("offsets, enabled")
    .eq("user_id", user.id)
    .single();

  return (
    <Card>
      <CardContent>
        <p className="mb-6 text-sm text-muted-foreground">{t("intro")}</p>
        <ReminderSettingsForm
          defaultOffsets={settings?.offsets ?? [-7, -3, 1, 14]}
          defaultEnabled={settings?.enabled ?? true}
        />
      </CardContent>
    </Card>
  );
}
