import { LayoutDashboard, FileText, Users } from "lucide-react";

// Settings lives in DashboardShell's UserMenu, not here — keep it in exactly one place.
export const NAV_ITEMS = [
  { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/customers", labelKey: "clients", icon: Users },
  { href: "/invoices", labelKey: "invoices", icon: FileText },
] as const;
