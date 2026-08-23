import { getTranslations } from "next-intl/server";
import { requireOnboardedUser } from "@/lib/auth";
import { isPro, FREE_INVOICE_LIMIT, PRO_PRICE_LABEL } from "@/lib/plan";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { startCheckout, openBillingPortal } from "./actions";

export default async function BillingSettingsPage() {
  const { supabase, user, profile } = await requireOnboardedUser();
  const t = await getTranslations("settings.billing");
  const tCommon = await getTranslations("common");

  const { count: activeInvoiceCount } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "unpaid");

  const status = profile.subscription_status;
  const pro = isPro(status);

  const statusLabel: Record<string, string> = {
    active: t("statusActive"),
    past_due: t("statusPastDue"),
    canceled: t("statusCanceled"),
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
                {pro ? t("proLabel", { price: PRO_PRICE_LABEL }) : t("freeLabel")}
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
            <Badge variant="outline">
              {pro ? (statusLabel[status] ?? status) : tCommon("free")}
            </Badge>
          </div>

          {status === "active" && profile.current_period_end && (
            <p className="text-xs text-muted-foreground">
              {t("renews", { date: formatDate(profile.current_period_end) })}
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
