"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

// Explicit `show` prop, not useFormStatus — the trigger lives in a DropdownMenuItem
// that unmounts on click, before logout finishes.
export function LogoutPendingOverlay({ show }: { show: boolean }) {
  const t = useTranslations("common");

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
      <Loader2 className="size-8 animate-spin text-brand-primary" aria-label={t("loading")} />
    </div>
  );
}
