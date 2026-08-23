import { LayoutDashboard, FileText, Users } from "lucide-react";

// Settings lives in the account menu (DashboardShell's UserMenu), not here —
// it's occasional/account-level configuration, not something used daily like
// these three, so it doesn't compete for space in the primary nav. Keep it
// in exactly one place; don't add it back here without also removing it
// from UserMenu.
export const NAV_ITEMS = [
  { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/customers", labelKey: "clients", icon: Users },
  { href: "/invoices", labelKey: "invoices", icon: FileText },
] as const;
