import { requireOnboardedUser } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { SiteFooter } from "@/components/site-footer";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireOnboardedUser();

  return (
    <DashboardShell
      businessName={profile.business_name || profile.email || user.email || ""}
      email={profile.email ?? user.email ?? ""}
      subscriptionStatus={profile.subscription_status}
      footer={<SiteFooter />}
    >
      {children}
    </DashboardShell>
  );
}
