import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Ban } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PublicCardShell } from "@/components/public-card-shell";
import { FormSubmitButton } from "@/components/form-submit-button";
import { getOptionalUser, getProfile } from "@/lib/auth";
import { logout } from "@/app/(auth)/actions";
import { SUPPORT_EMAIL } from "@/lib/constants";

export const metadata: Metadata = { title: "Account suspended" };

export default async function SuspendedPage() {
  const t = await getTranslations("suspended");

  // Only actually-suspended accounts belong here.
  const user = await getOptionalUser();
  if (!user) redirect("/login");
  const profile = await getProfile(user.id);
  // Null profile joins the same loop /dashboard would cause — sign out instead.
  if (!profile) redirect("/auth/reset-session");
  if (!profile.suspended_at) redirect("/dashboard");

  return (
    <PublicCardShell>
      <div className="text-center">
        <Ban className="mx-auto mb-4 size-10 text-destructive" aria-hidden />
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{t("title")}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{t("body")}</p>
        <p className="mt-3 text-sm text-muted-foreground">
          {t("contact")}{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand-primary hover:underline">
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
        <form action={logout} className="mt-6">
          <FormSubmitButton blockUi variant="outline">
            {t("logOut")}
          </FormSubmitButton>
        </form>
      </div>
    </PublicCardShell>
  );
}
