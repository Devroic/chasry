import { getTranslations, getLocale } from "next-intl/server";
import { requireOnboardedUser } from "@/lib/auth";
import { isPro, FREE_INVOICE_LIMIT, PRO_PRICE_AMOUNT } from "@/lib/plan";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { getNextRealPaymentDate } from "@/lib/billing";
import { startCheckout, openBillingPortal } from "./actions";

export default async function BillingSettingsPage() {
  const { supabase, user, profile } = await requireOnboardedUser();
  const t = await getTranslations("settings.billing");
  const tCommon = await getTranslations("common");
  const locale = await getLocale();

  const { count: activeInvoiceCount } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "unpaid");

  const status = profile.subscription_status;
  const pro = isPro(status);

  // Falls back to the stored period-end date on any failure (including a
  // subscription that genuinely has nothing upcoming to preview) — same
  // safety net as before, just now correct for a subscription mid-coupon
  // too, where the next *cycle* boundary and the next *charge* aren't the
  // same date.
  const nextPaymentDate =
    status === "active" && profile.stripe_subscription_id
      ? ((await getNextRealPaymentDate(profile.stripe_subscription_id)) ?? profile.current_period_end)
      : profile.current_period_end;

  const statusLabel: Record<string, string> = {
    active: t("statusActive"),
    past_due: t("statusPastDue"),
    canceled: t("statusCanceled"),
  };

  // Same colour vocabulary as InvoiceStatusBadge — emerald reads "healthy",
  // red "needs attention" — so a status chip means the same thing wherever it
  // appears. Only the two isPro() statuses can reach this map; every other
  // status renders the neutral "Free" chip instead.
  const proStatusStyles: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    past_due: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <div className="space-y-6">
      {status === "past_due" && (
        <Alert variant="destructive">
          <AlertDescription>{t("pastDueWarning", { limit: FREE_INVOICE_LIMIT })}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("planTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">
                {pro ? t("proLabel", { price: PRO_PRICE_AMOUNT }) : t("freeLabel")}
              </p>
              <p className="text-xs text-muted-foreground">
                {pro
                  ? t("proDescription")
                  : t("freeDescription", {
                      limit: FREE_INVOICE_LIMIT,
                      used: activeInvoiceCount ?? 0,
                    })}
              </p>
            </div>
            <Badge variant="outline" className={pro ? proStatusStyles[status] : undefined}>
              {pro ? (statusLabel[status] ?? status) : tCommon("free")}
            </Badge>
          </div>

          {status === "active" && nextPaymentDate && (
            <p className="text-xs text-muted-foreground">
              {t("nextPayment", { date: formatDate(nextPaymentDate, locale) })}
            </p>
          )}

          {pro ? (
            <form action={openBillingPortal}>
              <Button type="submit" variant="outline">
                {t("manageBilling")}
              </Button>
            </form>
          ) : (
            <form action={startCheckout}>
              <Button type="submit">{t("upgradeToPro")}</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
