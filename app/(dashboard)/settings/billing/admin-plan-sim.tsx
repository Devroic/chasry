"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { setAdminPlanOverride } from "@/app/admin/actions";
import { cn } from "@/lib/utils";

/** Admin-only QA control: simulates the free/Pro view of the app. Not a real plan change. */
export function AdminPlanSim({ planView }: { planView: "free" | "pro" }) {
  const t = useTranslations("admin.shell");
  const tCommon = useTranslations("common");
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-brand-primary/40 bg-brand-primary-tint/40 p-3">
      <div>
        <p className="text-xs font-semibold text-brand-primary">{t("planSimTitle")}</p>
        <p className="text-xs text-muted-foreground">{t("planSimHint")}</p>
      </div>
      <div className="flex items-center gap-1.5">
        {pending && (
          <Loader2 className="size-3 animate-spin text-muted-foreground" aria-label={tCommon("loading")} />
        )}
        <div className="inline-flex items-center rounded-lg border border-border bg-background p-0.5">
          {(["free", "pro"] as const).map((view) => (
            <button
              key={view}
              type="button"
              disabled={pending}
              aria-pressed={planView === view}
              onClick={() => startTransition(() => setAdminPlanOverride(view))}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                planView === view
                  ? "bg-brand-primary-tint text-brand-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {view === "free" ? t("planViewFree") : t("planViewPro")}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
