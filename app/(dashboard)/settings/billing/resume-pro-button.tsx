"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BlockingOverlay } from "@/components/blocking-overlay";
import { resumeSubscription } from "./actions";

/** Undoes a scheduled cancellation from the "canceling" alert. */
export function ResumeProButton() {
  const t = useTranslations("settings.billing.resume");
  const [pending, startTransition] = useTransition();

  return (
    <>
      {/* Blocks the page while Stripe processes; the button's spinner is the indicator. */}
      <BlockingOverlay show={pending} spinner={false} />
      <Button
        variant="outline"
        size="sm"
        loading={pending}
        className="border-amber-300 bg-transparent text-amber-800 hover:bg-amber-100 hover:text-amber-900 dark:border-amber-400/30 dark:text-amber-300 dark:hover:bg-amber-400/10 dark:hover:text-amber-200"
        onClick={() =>
          startTransition(async () => {
            const result = await resumeSubscription().catch(() => ({ error: t("failed") }));
            if (result?.error) toast.error(result.error);
            else toast.success(t("toast"));
          })
        }
      >
        <Play /> {t("button")}
      </Button>
    </>
  );
}
