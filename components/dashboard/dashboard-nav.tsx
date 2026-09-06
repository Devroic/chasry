"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Settings } from "lucide-react";
import { navItemClassName } from "@/components/nav-item";
import { NAV_ITEMS } from "./nav-items";

const SETTINGS_HREF = "/settings/profile";

export function DashboardNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ href, labelKey, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={onNavigate}
          className={navItemClassName(pathname === href || pathname.startsWith(`${href}/`))}
        >
          <Icon className="size-4 shrink-0" />
          {t(labelKey)}
        </Link>
      ))}
      <div className="mt-2 border-t border-border pt-2">
        <Link
          href={SETTINGS_HREF}
          onClick={onNavigate}
          className={navItemClassName(pathname.startsWith("/settings"))}
        >
          <Settings className="size-4 shrink-0" />
          {t("settings")}
        </Link>
      </div>
    </nav>
  );
}
