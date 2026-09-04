"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";

/** Shared body for the (dashboard) and admin error boundaries, so a page error keeps the shell. */
export function RouteError({ error, reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("common");

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 text-center">
      <h2 className="text-xl font-semibold text-foreground">{t("errorTitle")}</h2>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{t("errorDescription")}</p>
      <Button className="mt-5" onClick={reset}>
        {t("tryAgain")}
      </Button>
    </div>
  );
}
