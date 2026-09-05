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

  function item(href: string, label: string, Icon: typeof Settings, active: boolean) {
    return (
      <Link href={href} onClick={onNavigate} className={navItemClassName(active)}>
        <Icon className="size-4 shrink-0" />
        {label}
      </Link>
    );
  }

  return (
    <nav className="flex flex-1 flex-col gap-1">
      {NAV_ITEMS.map(({ href, labelKey, icon: Icon }) => (
        <span key={href}>
          {item(href, t(labelKey), Icon, pathname === href || pathname.startsWith(`${href}/`))}
        </span>
      ))}

      {/* Settings anchored at the bottom, one home for account + reminder + billing config. */}
      <div className="mt-auto border-t border-border pt-2">
        {item(SETTINGS_HREF, t("settings"), Settings, pathname.startsWith("/settings"))}
      </div>
    </nav>
  );
}
