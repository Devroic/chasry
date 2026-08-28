"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { requireAdmin, ADMIN_PLAN_OVERRIDE_COOKIE } from "@/lib/auth";

/** Flips the admin's own simulated Free/Pro view, see getAdminPlanOverride in lib/auth.ts. */
export async function setAdminPlanOverride(view: "free" | "pro") {
  await requireAdmin();
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_PLAN_OVERRIDE_COOKIE, view, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}
