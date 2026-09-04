import { getTranslations } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { BackLink } from "@/components/back-link";
import { getOptionalUser, getProfile } from "@/lib/auth";

/**
 * Chrome for the public content pages: an onboarded, signed-in visitor gets the dashboard shell,
 * everyone else the marketing header.
 */
export async function SitePageShell({
  maxWidthClassName,
  hideBackLink = false,
  children,
}: {
  /** e.g. "max-w-2xl" (help) or "max-w-3xl" (terms/privacy). */
  maxWidthClassName: string;
  /** ?standalone=1 links (signup checkbox) open in a fresh tab, so no Back. */
  hideBackLink?: boolean;
  children: React.ReactNode;
}) {
  const user = await getOptionalUser();
  const profile = user ? await getProfile(user.id) : null;
  const tCommon = await getTranslations("common");

  if (profile?.onboarded_at) {
    return (
      <DashboardShell
        businessName={profile.business_name || profile.email || user?.email || ""}
        email={profile.email ?? user?.email ?? ""}
        subscriptionStatus={profile.subscription_status}
        footer={<SiteFooter />}
      >
        <div className={maxWidthClassName}>
          <BackLink href="/dashboard" label={tCommon("back")} useBrowserBack />
          {children}
        </div>
      </DashboardShell>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-background via-background to-brand-secondary-tint/40">
      <SiteHeader />
      <main className="flex-1 px-6 py-10">
        {/* Back sits inside the centered column so it aligns with the title. */}
        <div className={`mx-auto ${maxWidthClassName}`}>
          {!hideBackLink && (
            <BackLink href="/" label={tCommon("back")} className="ml-0 mb-6" useBrowserBack />
          )}
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
