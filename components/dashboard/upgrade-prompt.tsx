import Image from "next/image";
import { Button } from "@/components/ui/button";
import { FREE_INVOICE_LIMIT, PRO_PRICE_LABEL } from "@/lib/plan";
import { startCheckout } from "@/app/(dashboard)/settings/billing/actions";

export function UpgradePrompt({ activeCount }: { activeCount: number }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-border bg-brand-primary-tint px-6 py-12 text-center">
      <Image src="/brand/mascot.png" alt="" width={200} height={200} className="mb-5 w-20" />
      <h3 className="text-base font-semibold text-foreground">
        You&rsquo;re using all {activeCount} of your {FREE_INVOICE_LIMIT} free invoices
      </h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        Mark one as paid, or upgrade to Pro for unlimited invoices and clients —{" "}
        {PRO_PRICE_LABEL}, cancel anytime.
      </p>
      <form action={startCheckout} className="mt-5">
        <Button type="submit">Upgrade to Pro</Button>
      </form>
    </div>
  );
}
