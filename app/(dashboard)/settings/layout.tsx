"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/dashboard/page-header";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/settings/profile", labelKey: "profile" },
  { href: "/settings/reminders", labelKey: "reminders" },
  { href: "/settings/billing", labelKey: "billing" },
] as const;

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations("settings");

  return (
    <div className="max-w-2xl">
      <PageHeader title={t("title")} />
      <div className="mb-6 flex gap-1 border-b border-border">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "border-b-2 px-3 py-2 text-sm font-medium",
                active
                  ? "border-brand-primary text-brand-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t(`tabs.${tab.labelKey}`)}
            </Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}
