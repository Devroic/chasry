"use client";

import { useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LogOut, ArrowLeft, LayoutDashboard, Users, BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { logout } from "@/app/(auth)/actions";
import { setAdminPlanOverride } from "@/app/admin/actions";
import { LogoutPendingOverlay } from "@/components/logout-pending-overlay";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", labelKey: "tabOverview", icon: LayoutDashboard },
  { href: "/admin/users", labelKey: "tabUsers", icon: Users },
  { href: "/admin/playbook", labelKey: "tabPlaybook", icon: BookOpen },
] as const;

// Simpler than DashboardShell (no collapsible sidebar, no mobile Sheet) — an internal tool, not
// part of the product a subscriber sees. Below `lg`, the sidebar becomes a horizontal nav row.
export function AdminShell({
  children,
  planView,
}: {
  children: React.ReactNode;
  planView: "free" | "pro";
}) {
  const pathname = usePathname();
  const t = useTranslations("admin.shell");
  const [loggingOut, startLogoutTransition] = useTransition();
  const handleLogout = () => startLogoutTransition(() => logout());

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <LogoutPendingOverlay show={loggingOut} />
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="flex h-20 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center">
              <Image
                src="/brand/logo-light-bg.png"
                alt="Chasry"
                width={220}
                height={60}
                className="h-10 w-auto sm:h-14 dark:hidden"
                priority
              />
              <Image
                src="/brand/logo-dark-bg.png"
                alt="Chasry"
                width={220}
                height={60}
                className="hidden h-10 w-auto sm:h-14 dark:block"
                priority
              />
            </Link>
            <Badge variant="outline" className="border-brand-primary/20 bg-brand-primary-tint text-brand-primary">
              {t("badge")}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <PlanViewToggle planView={planView} />
            <LanguageSwitcher />
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard">
                <ArrowLeft /> {t("backToApp")}
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut /> {t("logOut")}
            </Button>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-4 sm:px-6 lg:hidden">
          {NAV_ITEMS.map((item) => {
            const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap",
                  active
                    ? "border-brand-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>
      </header>

      <div className="flex flex-1">
        <aside className="sticky top-20 hidden h-[calc(100vh-5rem)] w-56 shrink-0 flex-col overflow-y-auto border-r border-border px-4 py-6 lg:flex">
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const active =
                item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-brand-primary-tint text-brand-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-8 sm:px-6">{children}</main>
      </div>
    </div>
  );
}

function PlanViewToggle({ planView }: { planView: "free" | "pro" }) {
  const t = useTranslations("admin.shell");
  const tCommon = useTranslations("common");
  const [pending, startTransition] = useTransition();

  return (
    <div className="hidden items-center gap-1.5 sm:flex">
      <span className="text-xs text-muted-foreground">{t("planViewLabel")}</span>
      {pending && (
        <Loader2 className="size-3 animate-spin text-muted-foreground" aria-label={tCommon("loading")} />
      )}
      <div className="inline-flex items-center rounded-lg border border-border p-0.5">
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => setAdminPlanOverride("free"))}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            planView === "free"
              ? "bg-brand-primary-tint text-brand-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {t("planViewFree")}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => setAdminPlanOverride("pro"))}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            planView === "pro"
              ? "bg-brand-primary-tint text-brand-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {t("planViewPro")}
        </button>
      </div>
    </div>
  );
}
