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

  // The auth email is the trustworthy one — profiles.email is a user-owned row, and
  // this guard must not be spoofable (see migration 0019 for the DB-side lock too).
  // Returned (not thrown): production masks thrown Server Action messages.
  const { data: target, error: targetError } = await supabase.auth.admin.getUserById(userId);
  if (targetError || !target.user) return { error: t("failed") };
  if (isAdminEmail(target.user.email)) return { error: t("cannotSuspendAdmin") };

  // Ban the auth user too, so their existing session can't keep hitting the
  // database directly through the REST API once the app locks them out.
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
