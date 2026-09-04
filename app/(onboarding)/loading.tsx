import { Loader2 } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function OnboardingLoading() {
  const t = await getTranslations("common");
  return (
    <div className="flex flex-1 items-center justify-center py-16">
      <Loader2 className="size-6 animate-spin text-brand-primary" aria-label={t("loading")} />
    </div>
  );
}
