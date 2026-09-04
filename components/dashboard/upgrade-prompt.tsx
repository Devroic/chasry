import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FormSubmitButton } from "@/components/form-submit-button";
import { FREE_INVOICE_LIMIT, PRO_PRICE_AMOUNT } from "@/lib/plan";
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
        {t("description", { price: PRO_PRICE_AMOUNT })}
      </p>
      <form action={startCheckout} className="mt-5">
        <FormSubmitButton blockUi>{t("cta")}</FormSubmitButton>
      </form>
      <Link href="/settings/billing" className="mt-3 text-sm font-medium text-brand-primary hover:underline">
        {t("compareLink")}
      </Link>
    </div>
  );
}
