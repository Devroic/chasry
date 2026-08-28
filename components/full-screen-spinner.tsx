import { Loader2 } from "lucide-react";
import { getTranslations } from "next-intl/server";

// For the two segment-root loading.tsx files only — those wrap the whole shell,
// unlike nested per-route loading.tsx files where RouteSpinner is correct.
export async function FullScreenSpinner() {
  const t = await getTranslations("common");
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="size-6 animate-spin text-brand-primary" aria-label={t("loading")} />
    </div>
  );
}
