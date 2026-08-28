import { getTranslations } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PRO_PRICE_AMOUNT } from "@/lib/plan";
import { getLifetimeRevenueCents } from "@/lib/billing";
import { formatMoney } from "@/lib/format";
import { isAdminEmail } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const metadata = { title: { absolute: "Overview · Chasry Admin" } };

/**
 * One bulk fetch, three columns, reduced in JS rather than several separate
 * count() queries. Fine at this app's current scale (see PROJECT.md, this is
 * built for freelancers/small businesses, not assumed scale from day one) —
 * worth revisiting if the user table ever grows large enough for this to
 * matter.
 */
/** A plain helper, not a component, so React Compiler's purity check (which
 * only applies to component/hook bodies) does not flag this Date.now() call
 * the way it would if it were called directly inside the page component. */
function daysAgoTimestamp(days: number) {
  return Date.now() - days * 86_400_000;
}

export default async function AdminOverviewPage() {
  const t = await getTranslations("admin.overview");
  const supabase = createAdminClient();
  const [{ data }, lifetimeRevenueCents] = await Promise.all([
    supabase.from("profiles").select("email, subscription_status, created_at, onboarded_at"),
    getLifetimeRevenueCents(),
  ]);
  // Admin accounts aren't real subscribers, counting them would skew every
  // metric here (and an admin's own subscription_status is a simulated
  // Free/Pro view anyway, see getAdminPlanOverride in lib/auth.ts).
  const profiles = (data ?? []).filter((p) => !isAdminEmail(p.email));

  const total = profiles.length;
  const active = profiles.filter((p) => p.subscription_status === "active").length;
  const pastDue = profiles.filter((p) => p.subscription_status === "past_due").length;
  const canceled = profiles.filter((p) => p.subscription_status === "canceled").length;
  const free = total - active - pastDue - canceled;
  const onboarded = profiles.filter((p) => p.onboarded_at).length;
  const stuckOnboarding = total - onboarded;

  const weekAgo = daysAgoTimestamp(7);
  const monthAgo = daysAgoTimestamp(30);
  const newThisWeek = profiles.filter((p) => new Date(p.created_at).getTime() >= weekAgo).length;
  const newThisMonth = profiles.filter((p) => new Date(p.created_at).getTime() >= monthAgo).length;

  const payingCount = active + pastDue;
  const mrr = payingCount * Number(PRO_PRICE_AMOUNT.replace(/[^\d.]/g, ""));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <Metric label={t("registeredUsers")} value={total} />
        <Metric label={t("proActive")} value={active} />
        <Metric label={t("pastDue")} value={pastDue} tone={pastDue > 0 ? "warn" : undefined} />
        <Metric label={t("free")} value={free} />
        <Metric label={t("canceled")} value={canceled} />
        <Metric label={t("stuckOnboarding")} value={stuckOnboarding} tone={stuckOnboarding > 0 ? "warn" : undefined} />
        <Metric label={t("newThisWeek")} value={newThisWeek} />
        <Metric label={t("newThisMonth")} value={newThisMonth} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("estimatedMrr")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">€{mrr.toLocaleString("en-IE")}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("mrrDescription", { count: payingCount, price: PRO_PRICE_AMOUNT })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("lifetimeRevenue")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">
              {lifetimeRevenueCents != null ? formatMoney(lifetimeRevenueCents / 100, "EUR") : "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {lifetimeRevenueCents != null ? t("lifetimeRevenueDescription") : t("lifetimeRevenueUnavailable")}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone?: "warn" }) {
  return (
    <Card size="sm">
      <CardContent>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={cn(
            "mt-1 text-2xl font-semibold",
            tone === "warn" && value > 0 ? "text-amber-600" : "text-foreground"
          )}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
