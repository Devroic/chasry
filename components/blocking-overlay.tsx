"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

/** Full-screen click shield for waits ending in a redirect; spinner={false} = invisible shield only. */
export function BlockingOverlay({ show, spinner = true }: { show: boolean; spinner?: boolean }) {
  const t = useTranslations("common");

  if (!show) return null;

  if (!spinner) {
    return <div aria-hidden className="fixed inset-0 z-50 cursor-wait" />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
      <Loader2 className="size-8 animate-spin text-brand-primary" aria-label={t("loading")} />
    </div>
  );
}
