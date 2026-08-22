import { LayoutDashboard, FileText, Users, Settings } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/customers", label: "Clients", icon: Users },
  { href: "/settings/profile", label: "Settings", icon: Settings },
] as const;
