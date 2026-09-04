"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Full-screen overlay that swallows clicks, for waits that end in a redirect.
 * `spinner={false}` renders an invisible click shield instead — for forms whose
 * submit button already shows the spinner, so the page just locks quietly.
 */
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
