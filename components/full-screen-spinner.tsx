import { Loader2 } from "lucide-react";
import { getTranslations } from "next-intl/server";

/**
 * For the two segment-root loading.tsx files (app/admin, app/(dashboard))
 * only. Those Suspense boundaries wrap the whole shell layout, not just the
 * page, so nothing else is on screen while they're showing, unlike the
 * nested per-route loading.tsx files, where the shell (header/sidebar)
 * stays mounted and RouteSpinner's content-area centering is correct.
 */
export async function FullScreenSpinner() {
  const t = await getTranslations("common");
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="size-6 animate-spin text-brand-primary" aria-label={t("loading")} />
    </div>
  );
}
