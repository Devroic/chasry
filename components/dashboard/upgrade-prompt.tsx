import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { FREE_INVOICE_LIMIT, PRO_PRICE_LABEL } from "@/lib/plan";
import { startCheckout } from "@/app/(dashboard)/settings/billing/actions";

export async function UpgradePrompt({ activeCount }: { activeCount: number }) {
  const t = await getTranslations("upgradePrompt");

  return (
    <div className="flex flex-col items-center rounded-xl border border-border bg-brand-primary-tint px-6 py-12 text-center">
      <Image src="/brand/mascot.png" alt="" width={200} height={200} className="mb-5 w-20" />
      <h3 className="text-base font-semibold text-foreground">
        {t("title", { count: activeCount, limit: FREE_INVOICE_LIMIT })}
      </h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        {t("description", { price: PRO_PRICE_LABEL })}
      </p>
      <form action={startCheckout} className="mt-5">
        <Button type="submit">{t("cta")}</Button>
      </form>
    </div>
  );
}
