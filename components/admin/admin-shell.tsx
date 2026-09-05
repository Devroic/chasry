"use client";

import { useTransition } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LogOut, ArrowLeft, LayoutDashboard, Users, Mail, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { logout } from "@/app/(auth)/actions";
import { LogoutPendingOverlay } from "@/components/logout-pending-overlay";
import { TabLink } from "@/components/tab-link";
import { navItemClassName } from "@/components/nav-item";

const NAV_ITEMS = [
  { href: "/admin", labelKey: "tabOverview", icon: LayoutDashboard },
  { href: "/admin/users", labelKey: "tabUsers", icon: Users },
  { href: "/admin/emails", labelKey: "tabEmails", icon: Mail },
  { href: "/admin/playbook", labelKey: "tabPlaybook", icon: BookOpen },
] as const;

// Simpler than DashboardShell (no collapsible sidebar, no mobile Sheet) — an internal tool, not
// part of the product a subscriber sees. Below `lg`, the sidebar becomes a horizontal nav row.
export function AdminShell({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const pathname = usePathname();
  const t = useTranslations("admin.shell");
  const [loggingOut, startLogoutTransition] = useTransition();
  const handleLogout = () => startLogoutTransition(() => logout());

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-background via-background to-brand-secondary-tint/40">
      <LogoutPendingOverlay show={loggingOut} />
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="flex h-20 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center">
              <BrandLogo />
            </Link>
            <Badge variant="outline" className="border-brand-primary/20 bg-brand-primary-tint text-brand-primary">
              {t("badge")}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard" aria-label={t("backToApp")}>
                <ArrowLeft /> <span className="hidden sm:inline">{t("backToApp")}</span>
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} aria-label={t("logOut")}>
              <LogOut /> <span className="hidden sm:inline">{t("logOut")}</span>
            </Button>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-4 sm:px-6 lg:hidden">
          {NAV_ITEMS.map((item) => {
            const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
            return (
              <TabLink key={item.href} href={item.href} active={active} className="whitespace-nowrap">
                {t(item.labelKey)}
              </TabLink>
            );
          })}
        </nav>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1">
        <aside className="sticky top-20 hidden h-[calc(100vh-5rem)] w-60 shrink-0 flex-col overflow-y-auto border-r border-border px-4 py-6 lg:flex">
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const active =
                item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className={navItemClassName(active)}>
                  <Icon className="size-4 shrink-0" />
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-8 sm:px-8">{children}</main>
      </div>

      {footer}
    </div>
  );
}
