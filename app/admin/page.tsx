import { getTranslations, getLocale } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { PRO_PRICE_AMOUNT } from "@/lib/plan";
import { getLifetimeRevenueCents } from "@/lib/billing";
import { formatMoney } from "@/lib/format";
import { isAdminEmail, requireAdmin } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const metadata = { title: { absolute: "Overview · Chasry Admin" } };

const SIGNUP_WEEKS = 8;

// Plain helper, not a component, so React Compiler's purity check doesn't flag this Date.now() call.
function daysAgoTimestamp(days: number) {
  return Date.now() - days * 86_400_000;
}

/** UTC Monday 00:00 of the week containing `ms`. */
function weekStartUtc(ms: number) {
  const d = new Date(ms);
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diff);
}

export default async function AdminOverviewPage() {
  // Layout guards don't cover RSC page-segment requests; every admin page gates itself.
  await requireAdmin();
  const t = await getTranslations("admin.overview");
  const locale = await getLocale();
  const supabase = createAdminClient();
  const [{ data }, { data: invoicesRaw }, { data: settingsRaw }, lifetimeRevenueCents] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, email, subscription_status, cancel_at_period_end, suspended_at, digest_enabled, created_at, onboarded_at"
        ),
      supabase
        .from("invoices")
        .select("user_id, status, recurring, recurred_at, snoozed_until, attachment_filename, paid_claimed_at"),
      supabase.from("reminder_settings").select("user_id, copy_self"),
      getLifetimeRevenueCents(),
    ]);
  // Admin accounts aren't real subscribers — counting them would skew every metric here.
  const profiles = (data ?? []).filter((p) => !isAdminEmail(p.email));
  const adminIds = new Set((data ?? []).filter((p) => isAdminEmail(p.email)).map((p) => p.id));
  const invoices = (invoicesRaw ?? []).filter((i) => !adminIds.has(i.user_id));
  const settings = (settingsRaw ?? []).filter((s) => !adminIds.has(s.user_id));

  const total = profiles.length;
  const active = profiles.filter((p) => p.subscription_status === "active").length;
  const pastDue = profiles.filter((p) => p.subscription_status === "past_due").length;
  const canceled = profiles.filter((p) => p.subscription_status === "canceled").length;
  const free = total - active - pastDue - canceled;
  const onboarded = profiles.filter((p) => p.onboarded_at).length;
  const stuckOnboarding = total - onboarded;
  const canceling = profiles.filter(
    (p) => p.subscription_status === "active" && p.cancel_at_period_end
  ).length;
  const suspended = profiles.filter((p) => p.suspended_at).length;

  const weekAgo = daysAgoTimestamp(7);
  const monthAgo = daysAgoTimestamp(30);
  const newThisWeek = profiles.filter((p) => new Date(p.created_at).getTime() >= weekAgo).length;
  const newThisMonth = profiles.filter((p) => new Date(p.created_at).getTime() >= monthAgo).length;

  const payingCount = active + pastDue;
  const mrr = payingCount * Number(PRO_PRICE_AMOUNT.replace(/[^\d.]/g, ""));
  const conversionPct = onboarded > 0 ? Math.round((payingCount / onboarded) * 100) : 0;

  // Signups bucketed into the last SIGNUP_WEEKS ISO weeks, oldest first.
  const currentWeekStart = weekStartUtc(daysAgoTimestamp(0));
  const weeks = Array.from({ length: SIGNUP_WEEKS }, (_, i) => {
    const start = currentWeekStart - (SIGNUP_WEEKS - 1 - i) * 7 * 86_400_000;
    return { start, count: 0 };
  });
  for (const profile of profiles) {
    const bucket = weeks.find((w) => {
      const signup = weekStartUtc(new Date(profile.created_at).getTime());
      return signup === w.start;
    });
    if (bucket) bucket.count += 1;
  }
  const maxWeekCount = Math.max(1, ...weeks.map((w) => w.count));
  const weekLabel = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

  const todayIso = new Date().toISOString().slice(0, 10);
  const usage = [
    {
      key: "recurring",
      label: t("usageRecurring"),
      value: invoices.filter((i) => i.recurring === "monthly" && !i.recurred_at).length,
    },
    {
      key: "snoozed",
      label: t("usageSnoozed"),
      value: invoices.filter(
        (i) => i.status === "unpaid" && i.snoozed_until && todayIso < i.snoozed_until
      ).length,
    },
    {
      key: "attachments",
      label: t("usageAttachments"),
      value: invoices.filter((i) => i.attachment_filename).length,
    },
    {
      key: "claims",
      label: t("usageClaims"),
      value: invoices.filter((i) => i.paid_claimed_at).length,
    },
    {
      key: "digest",
      label: t("usageDigest"),
      value: profiles.filter((p) => p.digest_enabled).length,
    },
    {
      key: "copySelf",
      label: t("usageCopySelf"),
      value: settings.filter((s) => s.copy_self).length,
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title={t("title")} description={t("subtitle")} className="mb-0" />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label={t("registeredUsers")} value={String(total)} />
        <StatCard label={t("proActive")} value={String(active)} />
        <StatCard label={t("pastDue")} value={String(pastDue)} tone={pastDue > 0 ? "warning" : "default"} />
        <StatCard label={t("free")} value={String(free)} />
        <StatCard label={t("canceling")} value={String(canceling)} tone={canceling > 0 ? "warning" : "default"} />
        <StatCard label={t("canceled")} value={String(canceled)} />
        <StatCard
          label={t("stuckOnboarding")}
          value={String(stuckOnboarding)}
          tone={stuckOnboarding > 0 ? "warning" : "default"}
        />
        <StatCard
          label={t("suspended")}
          value={String(suspended)}
          tone={suspended > 0 ? "warning" : "default"}
        />
        <StatCard label={t("newThisWeek")} value={String(newThisWeek)} />
        <StatCard label={t("newThisMonth")} value={String(newThisMonth)} />
        <StatCard label={t("conversion")} value={`${conversionPct}%`} hint={t("conversionHint")} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("estimatedMrr")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">{formatMoney(mrr, "EUR")}</p>
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("signupsTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-36 items-end gap-2" role="img" aria-label={t("signupsTitle")}>
              {weeks.map((week) => (
                <div key={week.start} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                  <span className="text-xs font-medium text-foreground">{week.count}</span>
                  <div
                    className={cn(
                      "w-full max-w-8 rounded-t",
                      week.count > 0 ? "bg-brand-primary/80" : "bg-muted"
                    )}
                    style={{ height: `${Math.max(4, (week.count / maxWeekCount) * 96)}px` }}
                  />
                  <span className="truncate text-[10px] text-muted-foreground">
                    {weekLabel.format(new Date(week.start))}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{t("signupsHint")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("usageTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {usage.map((row) => (
              <div key={row.key} className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="font-medium text-foreground">{row.value}</span>
              </div>
            ))}
            <p className="pt-1 text-xs text-muted-foreground">{t("usageHint")}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
