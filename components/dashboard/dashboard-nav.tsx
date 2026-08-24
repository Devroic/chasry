"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function DashboardNav({
  onNavigate,
  collapsed = false,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ href, labelKey, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        const linkClassName = cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          collapsed && "justify-center px-0",
          active
            ? "bg-brand-primary-tint text-brand-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        );

        if (!collapsed) {
          return (
            <Link key={href} href={href} onClick={onNavigate} className={linkClassName}>
              <Icon className="size-4 shrink-0" />
              {t(labelKey)}
            </Link>
          );
        }

        // Collapsed: icon only, with the label as an aria-label for screen
        // readers and a Tooltip for sighted mouse/keyboard users, instead of
        // silently dropping the label.
        return (
          <Tooltip key={href}>
            <TooltipTrigger asChild>
              <Link
                href={href}
                onClick={onNavigate}
                className={linkClassName}
                aria-label={t(labelKey)}
              >
                <Icon className="size-4 shrink-0" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">{t(labelKey)}</TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );
}
