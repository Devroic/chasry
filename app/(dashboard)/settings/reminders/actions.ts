"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { safeReturnTo } from "@/lib/return-to";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { reminderSettingsFormSchema } from "@/lib/validations/invoice";

export type ReminderSettingsState = { error?: string; success?: string; description?: string } | null;

const PRESET_OFFSETS = [-7, -3, -1, 0, 1, 3, 7, 14, 30];

export async function updateReminderSettings(
  _prev: ReminderSettingsState,
  formData: FormData
): Promise<ReminderSettingsState> {
  const t = await getTranslations("validation");
  const tCommon = await getTranslations("common");
  const tReminders = await getTranslations("settings.reminders");

  const selected = PRESET_OFFSETS.filter((offset) => formData.get(`offset_${offset}`) === "on");
  const enabled = formData.get("enabled") === "on";
  const copySelf = formData.get("copy_self") === "on";

  const parsed = reminderSettingsFormSchema(t).safeParse({
    offsets: selected,
    enabled,
    copy_self: copySelf,
    payment_link: formData.get("payment_link"),
    reminder_locale: formData.get("reminder_locale"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? t("invalidInput") };

  const { offsets, payment_link, reminder_locale, ...rest } = parsed.data;
  const { supabase, user } = await requireUser();

  const [scheduleResult, profileResult] = await Promise.all([
    supabase
      .from("reminder_settings")
      .update({ offsets, enabled: rest.enabled, copy_self: rest.copy_self })
      .eq("user_id", user.id),
    supabase.from("profiles").update({ payment_link, reminder_locale }).eq("id", user.id),
  ]);

  if (scheduleResult.error || profileResult.error) return { error: tCommon("saveFailed") };

  revalidatePath("/settings/reminders");
  // Came from an invoice page to change a default: take them straight back.
  const returnTo = safeReturnTo(formData.get("return_to"));
  if (returnTo) redirect(returnTo);
  return { success: tReminders("savedTitle"), description: tReminders("savedDescription") };
}

/** Marks the dashboard "check your reminder schedule" step done once the user opens this page. */
export async function markScheduleReviewed() {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("profiles")
    .update({ reminder_schedule_reviewed: true })
    .eq("id", user.id)
    .eq("reminder_schedule_reviewed", false);

  if (!error) revalidatePath("/dashboard");
}

/** Toggles the Monday summary email (profiles.digest_enabled). */
export async function updateDigestPreference(enabled: boolean) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("profiles")
    .update({ digest_enabled: !!enabled })
    .eq("id", user.id);

  if (error) {
    const tCommon = await getTranslations("common");
    throw new Error(tCommon("saveFailed"));
  }

  revalidatePath("/settings/reminders");
}
