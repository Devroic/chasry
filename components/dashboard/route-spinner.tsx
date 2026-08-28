import { Loader2 } from "lucide-react";
import { getTranslations } from "next-intl/server";

/**
 * Shared fallback for every `loading.tsx` under the dashboard.
 *
 * These exist per route segment on purpose. A single `loading.tsx` at the
 * route-group root only covers entering the group, so navigating from a list
 * page to a detail or edit page showed nothing at all until the server
 * finished, which read as the click not registering.
 */
export async function RouteSpinner() {
  const t = await getTranslations("common");
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="size-6 animate-spin text-brand-primary" aria-label={t("loading")} />
    </div>
  );
}
