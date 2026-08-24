"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LogOut, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { logout } from "@/app/(auth)/actions";
import { cn } from "@/lib/utils";

/**
 * Deliberately not the customer-facing DashboardShell: this is a single-
 * operator internal tool, not part of the product a subscriber ever sees,
 * so it skips the sidebar/mobile-nav machinery in favor of a plain top tab
 * bar. It does still use next-intl and carries its own theme/language
 * controls, same as everywhere else in the app.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations("admin.shell");

  const tabs = [
    { href: "/admin", label: t("tabOverview") },
    { href: "/admin/users", label: t("tabUsers") },
    { href: "/admin/playbook", label: t("tabPlaybook") },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Image
              src="/brand/logo-light-bg.png"
              alt="Chasry"
              width={140}
              height={38}
              className="h-7 w-auto dark:hidden"
              priority
            />
            <Image
              src="/brand/logo-dark-bg.png"
              alt="Chasry"
              width={140}
              height={38}
              className="hidden h-7 w-auto dark:block"
              priority
            />
            <Badge variant="outline" className="text-muted-foreground">
              {t("badge")}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard">
                <ArrowLeft /> {t("backToApp")}
              </Link>
            </Button>
            <form action={logout}>
              <Button type="submit" variant="ghost" size="sm">
                <LogOut /> {t("logOut")}
              </Button>
            </form>
          </div>
        </div>

        <nav className="mx-auto flex max-w-6xl gap-1 px-4 sm:px-6">
          {tabs.map((tab) => {
            const active = tab.href === "/admin" ? pathname === "/admin" : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "border-b-2 px-3 py-2.5 text-sm font-medium",
                  active
                    ? "border-brand-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
