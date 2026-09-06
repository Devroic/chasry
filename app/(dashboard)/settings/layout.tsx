"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/page-header";
import { TabLink } from "@/components/tab-link";

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
      <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((tab) => (
          <TabLink
            key={tab.href}
            href={tab.href}
            active={
              pathname === tab.href ||
              (tab.href === "/settings/profile" && pathname === "/settings/password")
            }
            className="whitespace-nowrap"
          >
            {t(`tabs.${tab.labelKey}`)}
          </TabLink>
        ))}
      </nav>
      {children}
    </div>
  );
}
