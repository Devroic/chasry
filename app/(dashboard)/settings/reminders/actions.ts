"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { reminderOffsetsSchema } from "@/lib/validations/invoice";

export type ReminderSettingsState = { error?: string; success?: string } | null;

const PRESET_OFFSETS = [-7, -3, -1, 0, 1, 3, 7, 14, 30];

export async function updateReminderSettings(
  _prev: ReminderSettingsState,
  formData: FormData
): Promise<ReminderSettingsState> {
  const selected = PRESET_OFFSETS.filter((offset) => formData.get(`offset_${offset}`) === "on");
  const enabled = formData.get("enabled") === "on";

  const parsed = reminderOffsetsSchema.safeParse({ offsets: selected, enabled });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("reminder_settings")
    .update(parsed.data)
    .eq("user_id", user.id);

  if (error) return { error: "Couldn't save changes. Try again." };

  revalidatePath("/settings/reminders");
  return { success: "Saved." };
}
