"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Driven by an explicit `show` prop rather than useFormStatus, the logout
 * trigger in DashboardShell lives inside a Radix DropdownMenuItem, which
 * unmounts its content when the menu closes on click, before the logout
 * transition finishes. A form-status-based overlay nested in that same
 * form would disappear with it. Lifting pending state to the shell
 * component (via useTransition) keeps this mounted for the whole logout.
 */
export function LogoutPendingOverlay({ show }: { show: boolean }) {
  const t = useTranslations("common");

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
      <Loader2 className="size-8 animate-spin text-brand-primary" aria-label={t("loading")} />
    </div>
  );
}
