import { requireUser } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { ReminderSettingsForm } from "./reminder-settings-form";

export default async function ReminderSettingsPage() {
  const { supabase, user } = await requireUser();

  const { data: settings } = await supabase
    .from("reminder_settings")
    .select("offsets, enabled")
    .eq("user_id", user.id)
    .single();

  return (
    <Card>
      <CardContent className="pt-6">
        <p className="mb-6 text-sm text-muted-foreground">
          Chasry checks every unpaid invoice once a day and sends a reminder on any of the days
          you turn on below, relative to the invoice&rsquo;s due date.
        </p>
        <ReminderSettingsForm
          defaultOffsets={settings?.offsets ?? [-7, -3, 1]}
          defaultEnabled={settings?.enabled ?? true}
        />
      </CardContent>
    </Card>
  );
}
