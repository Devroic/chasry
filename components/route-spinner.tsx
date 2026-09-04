import { Loader2 } from "lucide-react";
import { getTranslations } from "next-intl/server";

// Shared fallback for every per-route loading.tsx under the dashboard — a
// single group-root loading.tsx only covers entering the group, not later navigation.
export async function RouteSpinner() {
  const t = await getTranslations("common");
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="size-6 animate-spin text-brand-primary" aria-label={t("loading")} />
    </div>
  );
}
