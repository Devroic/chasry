"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Menu,
  LogOut,
  ChevronDown,
  Settings,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { DashboardNav } from "./dashboard-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { logout } from "@/app/(auth)/actions";
import { LogoutPendingOverlay } from "@/components/logout-pending-overlay";
import { isPro } from "@/lib/plan";
import { cn } from "@/lib/utils";
import type { SubscriptionStatus } from "@/types/database.types";

export function DashboardShell({
  businessName,
  email,
  subscriptionStatus,
  isAdmin,
  footer,
  children,
}: {
  businessName: string;
  email: string;
  subscriptionStatus: SubscriptionStatus;
  isAdmin?: boolean;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  // Desktop-only: manually toggled, defaults open. Resets on a full reload
  // rather than persisting to disk — the sidebar only has three links, so
  // that's a fair trade against the hydration-mismatch risk of reading
  // localStorage before the first client render (see ThemeToggle's history
  // in ARCHITECTURE.md for why that risk is taken seriously here).
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loggingOut, startLogoutTransition] = useTransition();
  const t = useTranslations("header");
  const initial = businessName.trim().charAt(0).toUpperCase() || "?";
  const pro = isPro(subscriptionStatus);
  const handleLogout = () => startLogoutTransition(() => logout());

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-background via-background to-brand-secondary-tint/40">
      <LogoutPendingOverlay show={loggingOut} />
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="flex h-20 items-center justify-between px-4 sm:px-6">
          <Link href="/dashboard" className="flex items-center">
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

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <ThemeToggle />
            {!pro && (
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link href="/settings/billing">
                  <Sparkles /> {t("upgradeToPro")}
                </Link>
              </Button>
            )}
            {isAdmin && (
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin">
                  <ShieldCheck /> {t("admin")}
                </Link>
              </Button>
            )}

            <UserMenu
              businessName={businessName}
              email={email}
              initial={initial}
              subscriptionStatus={subscriptionStatus}
              onNavigate={() => setMobileOpen(false)}
              onLogout={handleLogout}
            />

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t("openMenu")}>
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-4">
                <SheetTitle className="sr-only">{t("navigation")}</SheetTitle>
                {!pro && (
                  <Button asChild className="mt-8 mb-4 w-full" onClick={() => setMobileOpen(false)}>
                    <Link href="/settings/billing">
                      <Sparkles /> {t("upgradeToPro")}
                    </Link>
                  </Button>
                )}
                <DashboardNav onNavigate={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1">
        <aside
          className={cn(
            // Sticky and bounded to the viewport (header is h-20 = 5rem), not
            // the flex row's natural `align-items: stretch` height, which
            // matches `main` and is only as tall as the page's content. That
            // stretched height is what pushed a bottom-pinned button off
            // screen on a real, content-heavy dashboard: `main` was much
            // taller than the viewport, so "bottom of aside" was far below
            // the fold. Bounding `aside` to the viewport means "bottom" is
            // the bottom of what's actually visible, and `sticky` keeps it
            // there while the page scrolls, the same way the header does.
            "sticky top-20 hidden h-[calc(100vh-5rem)] shrink-0 flex-col overflow-y-auto border-r border-border py-6 transition-[width] duration-200 lg:flex",
            sidebarCollapsed ? "w-16 px-2" : "w-60 px-4"
          )}
        >
          <DashboardNav collapsed={sidebarCollapsed} />

          <div className={cn("mt-auto flex pt-4", sidebarCollapsed ? "justify-center" : "justify-end")}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
                  aria-label={sidebarCollapsed ? t("expandSidebar") : t("collapseSidebar")}
                >
                  {sidebarCollapsed ? (
                    <PanelLeftOpen className="size-4" />
                  ) : (
                    <PanelLeftClose className="size-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {sidebarCollapsed ? t("expandSidebar") : t("collapseSidebar")}
              </TooltipContent>
            </Tooltip>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-8 sm:px-8">{children}</main>
      </div>

      {footer}
    </div>
  );
}

function UserMenu({
  businessName,
  email,
  initial,
  subscriptionStatus,
  onNavigate,
  onLogout,
}: {
  businessName: string;
  email: string;
  initial: string;
  subscriptionStatus: SubscriptionStatus;
  onNavigate: () => void;
  onLogout: () => void;
}) {
  const pro = isPro(subscriptionStatus);
  const t = useTranslations("header");
  const tCommon = useTranslations("common");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-1.5 rounded-full p-1 hover:bg-muted"
          aria-label={t("accountMenu")}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-primary text-sm font-semibold text-white dark:bg-[#3f63b8]">
            {initial}
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          <span className="flex items-center gap-1.5">
            <span className="truncate">{businessName}</span>
            <Badge
              variant="outline"
              className={
                pro
                  ? "border-transparent bg-brand-secondary-tint text-brand-primary-hover"
                  : "text-muted-foreground"
              }
            >
              {pro ? tCommon("pro") : tCommon("free")}
            </Badge>
          </span>
          <span className="block truncate text-xs font-normal text-muted-foreground">
            {email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild onClick={onNavigate}>
          <Link href="/settings/profile" className="flex items-center gap-2">
            <Settings className="size-4" /> {t("settings")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => {
            onNavigate();
            onLogout();
          }}
        >
          <LogOut className="size-4" /> {t("logOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
