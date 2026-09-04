"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { reminderOffsetsSchema } from "@/lib/validations/invoice";

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

  const parsed = reminderOffsetsSchema(t).safeParse({ offsets: selected, enabled, copy_self: copySelf });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? t("invalidInput") };

  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("reminder_settings")
    .update(parsed.data)
    .eq("user_id", user.id);

  if (error) return { error: tCommon("saveFailed") };

  revalidatePath("/settings/reminders");
  return { success: tReminders("savedTitle"), description: tReminders("savedDescription") };
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
