"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, LogOut, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { DashboardNav } from "./dashboard-nav";
import { logout } from "@/app/(auth)/actions";
import { isPro, planLabel } from "@/lib/plan";
import type { SubscriptionStatus } from "@/types/database.types";

export function DashboardShell({
  businessName,
  email,
  subscriptionStatus,
  children,
}: {
  businessName: string;
  email: string;
  subscriptionStatus: SubscriptionStatus;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const initial = businessName.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="min-h-screen bg-muted/40">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-border bg-sidebar px-4 py-6 lg:flex">
        <Link href="/dashboard" className="mb-8 flex items-center px-2">
          <Image
            src="/brand/logo-light-bg.png"
            alt="Chasry"
            width={120}
            height={32}
            className="h-7 w-auto"
          />
        </Link>
        <DashboardNav />
        <div className="mt-auto pt-4">
          <UserMenu
            businessName={businessName}
            email={email}
            initial={initial}
            subscriptionStatus={subscriptionStatus}
          />
        </div>
      </aside>

      <div className="lg:pl-60">
        {/* Mobile topbar */}
        <header className="flex items-center justify-between border-b border-border bg-background px-4 py-3 lg:hidden">
          <Link href="/dashboard" className="flex items-center">
            <Image
              src="/brand/logo-light-bg.png"
              alt="Chasry"
              width={110}
              height={30}
              className="h-6 w-auto"
            />
          </Link>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-4">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <Link
                href="/dashboard"
                className="mb-8 flex items-center px-2"
                onClick={() => setMobileOpen(false)}
              >
                <Image
                  src="/brand/logo-light-bg.png"
                  alt="Chasry"
                  width={120}
                  height={32}
                  className="h-7 w-auto"
                />
              </Link>
              <DashboardNav onNavigate={() => setMobileOpen(false)} />
              <div className="mt-8">
                <UserMenu
                  businessName={businessName}
                  email={email}
                  initial={initial}
                  subscriptionStatus={subscriptionStatus}
                />
              </div>
            </SheetContent>
          </Sheet>
        </header>

        <main className="px-4 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}

function UserMenu({
  businessName,
  email,
  initial,
  subscriptionStatus,
}: {
  businessName: string;
  email: string;
  initial: string;
  subscriptionStatus: SubscriptionStatus;
}) {
  const pro = isPro(subscriptionStatus);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-muted">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-primary text-sm font-semibold text-white">
            {initial}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="block truncate text-sm font-medium text-foreground">
                {businessName}
              </span>
              <Badge
                variant="outline"
                className={
                  pro
                    ? "border-transparent bg-brand-secondary-tint text-brand-primary-hover"
                    : "text-muted-foreground"
                }
              >
                {planLabel(subscriptionStatus)}
              </Badge>
            </span>
            <span className="block truncate text-xs text-muted-foreground">{email}</span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>{email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings/profile">Settings</Link>
        </DropdownMenuItem>
        {!pro && (
          <DropdownMenuItem asChild>
            <Link href="/settings/billing">Upgrade to Pro</Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild variant="destructive">
          <form action={logout} className="w-full">
            <button type="submit" className="flex w-full items-center gap-2">
              <LogOut className="size-4" /> Log out
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
