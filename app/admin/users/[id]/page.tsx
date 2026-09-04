import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { BackLink } from "@/components/back-link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { PLAN_STATUS_STYLE, planStatusLabels } from "@/components/admin/plan-status";
import { STATUS_TONES } from "@/components/status-tones";
import { SuspendUserButton } from "./suspend-button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { getNextRealPaymentDate } from "@/lib/billing";
import { isPro } from "@/lib/plan";

export const metadata = { title: { absolute: "User · Chasry Admin" } };

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // Layout guards don't cover RSC page-segment requests; every admin page gates itself.
  await requireAdmin();
  const { id } = await params;
  const t = await getTranslations("admin.userDetail");
  const tStatus = await getTranslations("admin.status");
  const tSuspend = await getTranslations("admin.suspend");
  const locale = await getLocale();
  const statusLabel = planStatusLabels(tStatus);

  const supabase = createAdminClient();

  const [{ data: profile }, { count: activeInvoiceCount }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, business_name, email, subscription_status, stripe_subscription_id, current_period_end, cancel_at_period_end, onboarded_at, suspended_at, created_at"
      )
      .eq("id", id)
      .single(),
    supabase.from("invoices").select("id", { count: "exact", head: true }).eq("user_id", id).eq("status", "unpaid"),
  ]);

  if (!profile) notFound();

  const pro = isPro(profile.subscription_status);
  const canceling = profile.subscription_status === "active" && profile.cancel_at_period_end;
  const nextPaymentDate =
    profile.subscription_status === "active" && !canceling && profile.stripe_subscription_id
      ? ((await getNextRealPaymentDate(profile.stripe_subscription_id)) ?? profile.current_period_end)
      : profile.current_period_end;

  return (
    <div>
      <BackLink href="/admin/users" label={t("backLabel")} />

      <PageHeader
        title={profile.business_name || profile.email}
        titleBadge={
          <span className="inline-flex items-center gap-1.5">
            <Badge
              variant="outline"
              className={pro ? PLAN_STATUS_STYLE[profile.subscription_status] : undefined}
            >
              {statusLabel[profile.subscription_status] ?? profile.subscription_status}
            </Badge>
            {profile.suspended_at && (
              <Badge variant="outline" className={STATUS_TONES.negative}>
                {tSuspend("badge")}
              </Badge>
            )}
          </span>
        }
        action={
          <SuspendUserButton
            userId={profile.id}
            userLabel={profile.business_name || profile.email}
            suspended={profile.suspended_at != null}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 text-sm">
            <Row label={t("email")} value={profile.email} />
            <Row label={t("activeInvoices")} value={String(activeInvoiceCount ?? 0)} />
            <Row
              label={t("onboarded")}
              value={profile.onboarded_at ? formatDate(profile.onboarded_at, locale) : t("notYet")}
            />
            <Row label={t("joined")} value={formatDate(profile.created_at, locale)} />
            {profile.suspended_at && (
              <Row
                label={tSuspend("sinceLabel")}
                value={
                  <span className="text-destructive">{formatDate(profile.suspended_at, locale)}</span>
                }
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 text-sm">
            <Row label={t("plan")} value={statusLabel[profile.subscription_status] ?? profile.subscription_status} />
            <Row
              label={canceling ? t("cancels") : t("nextPayment")}
              value={nextPaymentDate ? formatDate(nextPaymentDate, locale) : t("noneScheduled")}
            />
            <Row
              label={t("stripeSubscription")}
              value={profile.stripe_subscription_id ?? t("none")}
              mono
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono text-xs text-foreground" : "text-foreground"}>{value}</span>
    </div>
  );
}
