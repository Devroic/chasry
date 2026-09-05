"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Settings } from "lucide-react";
import { navItemClassName } from "@/components/nav-item";
import { NAV_ITEMS } from "./nav-items";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const SETTINGS_HREF = "/settings/profile";

export function DashboardNav({
  onNavigate,
  collapsed = false,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const t = useTranslations("nav");

  function item(href: string, label: string, Icon: typeof Settings, active: boolean) {
    const linkClassName = navItemClassName(active, collapsed);
    if (!collapsed) {
      return (
        <Link href={href} onClick={onNavigate} className={linkClassName}>
          <Icon className="size-4 shrink-0" />
          {label}
        </Link>
      );
    }
    // Collapsed: icon only, label moves to aria-label + a Tooltip instead of dropping.
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href={href} onClick={onNavigate} className={linkClassName} aria-label={label}>
            <Icon className="size-4 shrink-0" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
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
