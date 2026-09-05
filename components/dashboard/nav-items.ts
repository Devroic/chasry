import { LayoutDashboard, FileText, Users } from "lucide-react";

// Settings is rendered separately (bottom-anchored) in DashboardNav, plus in the account menu.
export const NAV_ITEMS = [
  { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/clients", labelKey: "clients", icon: Users },
  { href: "/invoices", labelKey: "invoices", icon: FileText },
] as const;
