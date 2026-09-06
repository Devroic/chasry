import { getTranslations } from "next-intl/server";
import { requireUser, getProfile } from "@/lib/auth";
import { isPro } from "@/lib/plan";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReminderPreviewDialog } from "@/components/dashboard/reminder-preview-dialog";
import { buildReminderPreviews } from "@/lib/reminder-preview";
import { addDaysUtc } from "@/lib/reminders";
import { ReminderSettingsForm } from "./reminder-settings-form";
import { DigestToggle } from "./digest-toggle";
import { MarkScheduleReviewed } from "./mark-schedule-reviewed";

export const metadata = { title: "Reminders" };

export default async function ReminderSettingsPage() {
  const { supabase, user } = await requireUser();
  const t = await getTranslations("settings.reminders");
  const tDigest = await getTranslations("settings.digest");
  const tPreview = await getTranslations("reminderPreview");

  const [{ data: settings }, profile] = await Promise.all([
    supabase
      .from("reminder_settings")
      .select("offsets, enabled, copy_self")
      .eq("user_id", user.id)
      .single(),
    getProfile(user.id),
  ]);

  const offsets = settings?.offsets ?? [-3, -1, 0, 1, 3];
  const enabled = settings?.enabled ?? true;

  // Sample invoice, using their saved schedule, so the real emails are visible before logging one.
  const previews =
    enabled && offsets.length > 0 && profile
      ? await buildReminderPreviews({
          offsets,
          businessName: profile.business_name || profile.email,
          clientName: tPreview("sampleClientName"),
          invoiceNumber: "INV-001",
          amount: 450,
          currency: profile.currency,
          dueDate: addDaysUtc(new Date().toISOString().slice(0, 10), 7).toISOString().slice(0, 10),
          paymentLink: profile.payment_link ?? undefined,
          locale: profile.reminder_locale,
          showBranding: !isPro(profile.subscription_status),
        })
      : [];

  return (
    <div className="space-y-6">
      <MarkScheduleReviewed reviewed={profile?.reminder_schedule_reviewed ?? true} />
      <Card>
        <CardContent>
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <p className="max-w-md text-sm text-muted-foreground">{t("intro")}</p>
            {previews.length > 0 && (
              <ReminderPreviewDialog previews={previews} description={tPreview("sampleDescription")} />
            )}
          </div>
          <ReminderSettingsForm
            defaultOffsets={offsets}
            defaultEnabled={enabled}
            defaultCopySelf={settings?.copy_self ?? false}
            defaultPaymentLink={profile?.payment_link ?? ""}
            defaultReminderLocale={profile?.reminder_locale ?? "en"}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{tDigest("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <DigestToggle defaultEnabled={profile?.digest_enabled ?? true} />
        </CardContent>
      </Card>
    </div>
  );
}
