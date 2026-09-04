"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { requireAdmin, isAdminEmail } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/** Suspends or reinstates an account. Suspension blocks the app and all outgoing email. */
export async function setUserSuspended(userId: string, suspend: boolean) {
  await requireAdmin();
  const t = await getTranslations("admin.suspend");
  const supabase = createAdminClient();

  // Trust the auth email; profiles.email is user-owned and spoofable (migration 0019 locks DB-side).
  const { data: target, error: targetError } = await supabase.auth.admin.getUserById(userId);
  if (targetError || !target.user) return { error: t("failed") };
  if (isAdminEmail(target.user.email)) return { error: t("cannotSuspendAdmin") };

  // Ban the auth user too, so an existing session can't keep hitting the REST API directly.
  const { error: banError } = await supabase.auth.admin.updateUserById(userId, {
    ban_duration: suspend ? "876000h" : "none",
  });
  if (banError) return { error: t("failed") };

  const { error } = await supabase
    .from("profiles")
    .update({ suspended_at: suspend ? new Date().toISOString() : null })
    .eq("id", userId);
  if (error) return { error: t("failed") };

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
}
