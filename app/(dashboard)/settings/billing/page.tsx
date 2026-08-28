import { getTranslations, getLocale } from "next-intl/server";
import { requireOnboardedUser } from "@/lib/auth";
import { isPro, FREE_INVOICE_LIMIT, PRO_PRICE_AMOUNT } from "@/lib/plan";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { getNextRealPaymentDate } from "@/lib/billing";
import { startCheckout, openBillingPortal } from "./actions";

export const metadata = { title: "Billing" };

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
  // subscription_status stays "active" until the period actually ends;
  // cancel_at_period_end is the only signal it won't renew.
  const canceling = status === "active" && profile.cancel_at_period_end;

  // Falls back to the stored period-end date on failure. Skipped once
  // canceling — current_period_end is already the date Pro access ends.
  const nextPaymentDate =
    status === "active" && !canceling && profile.stripe_subscription_id
      ? ((await getNextRealPaymentDate(profile.stripe_subscription_id)) ?? profile.current_period_end)
      : profile.current_period_end;

  const statusLabel: Record<string, string> = {
    active: canceling ? t("statusCanceling") : t("statusActive"),
    past_due: t("statusPastDue"),
    canceled: t("statusCanceled"),
  };

  // Same colour vocabulary as InvoiceStatusBadge (emerald = healthy, red = needs attention).
  const proStatusStyles: Record<string, string> = {
    active: canceling
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-emerald-50 text-emerald-700 border-emerald-200",
    past_due: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <div className="space-y-6">
      {status === "past_due" && (
        <Alert variant="destructive">
          <AlertDescription>{t("pastDueWarning", { limit: FREE_INVOICE_LIMIT })}</AlertDescription>
        </Alert>
      )}

      {canceling && profile.current_period_end && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTitle className="text-amber-800">{t("cancelingTitle")}</AlertTitle>
          <AlertDescription className="text-amber-700">
            {t("cancelingWarning", { date: formatDate(profile.current_period_end, locale) })}
          </AlertDescription>
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

          {status === "active" && !canceling && nextPaymentDate && (
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
