import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { AdminShell } from "@/components/admin/admin-shell";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: { template: "%s · Chasry Admin", default: "Chasry Admin" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return <AdminShell footer={<SiteFooter />}>{children}</AdminShell>;
}
