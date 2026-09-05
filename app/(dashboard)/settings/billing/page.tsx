import { getTranslations, getLocale } from "next-intl/server";
import { Sparkles } from "lucide-react";
import { requireOnboardedUser, isAdminEmail, getAdminPlanOverride } from "@/lib/auth";
import { isPro, FREE_INVOICE_LIMIT, PRO_PRICE_AMOUNT } from "@/lib/plan";
import { FormSubmitButton } from "@/components/form-submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { PlanFeatureList, buildPlanFeatures } from "@/components/plan-comparison";
import { formatDate } from "@/lib/format";
import { getNextRealPaymentDate } from "@/lib/billing";
import { cn } from "@/lib/utils";
import { startCheckout, openBillingPortal } from "./actions";
import { DowngradeDialog } from "./downgrade-dialog";
import { ResumeProButton } from "./resume-pro-button";
import { AdminPlanSim } from "./admin-plan-sim";

export const metadata = { title: "Billing" };

export default async function BillingSettingsPage() {
  const { supabase, user, profile } = await requireOnboardedUser();
  const t = await getTranslations("settings.billing");
  const tUpgrade = await getTranslations("upgrade");
  const tPlans = await getTranslations("plans");
  const tCommon = await getTranslations("common");
  const locale = await getLocale();

  // Admin accounts see a plan-simulation toggle here (their subscription_status is the simulated view).
  const isAdmin = isAdminEmail(profile.email);
  const adminPlanView = isAdmin ? await getAdminPlanOverride() : null;

  const status = profile.subscription_status;
  const pro = isPro(status);
  // Status stays "active" until period end; cancel_at_period_end is the only won't-renew signal.
  const canceling = status === "active" && profile.cancel_at_period_end;

  // Stripe lookup falls back to the stored period end; skipped when canceling (that IS the end date).
  const [{ count: activeInvoiceCount }, stripeNextPaymentDate] = await Promise.all([
    // Usage only renders on the free plan's card.
    pro
      ? Promise.resolve({ count: null })
      : supabase
          .from("invoices")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "unpaid"),
    status === "active" && !canceling && profile.stripe_subscription_id
      ? getNextRealPaymentDate(profile.stripe_subscription_id)
      : Promise.resolve(null),
  ]);
  const nextPaymentDate = stripeNextPaymentDate ?? profile.current_period_end;
  // When canceling, current_period_end is when Pro ends; else next renewal is earliest downgrade.
  const periodEndLabel = canceling
    ? profile.current_period_end && formatDate(profile.current_period_end, locale)
    : nextPaymentDate && formatDate(nextPaymentDate, locale);

  const planFeatures = buildPlanFeatures(tPlans);
  const srLabels = {
    includedLabel: tPlans("included"),
    excludedLabel: tPlans("notIncluded"),
  };
  const currentPlanBadge = (
    <Badge className="border-transparent bg-brand-primary-tint text-brand-primary">
      {tUpgrade("currentPlan")}
    </Badge>
  );

  return (
    <div className="space-y-6">
      {adminPlanView && <AdminPlanSim planView={adminPlanView} />}

      {status === "past_due" && (
        <Alert variant="destructive">
          <AlertDescription>{t("pastDueWarning", { limit: FREE_INVOICE_LIMIT })}</AlertDescription>
        </Alert>
      )}

      {canceling && profile.current_period_end && (
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-400/20 dark:bg-amber-400/10">
          <AlertTitle className="text-amber-800 dark:text-amber-300">{t("cancelingTitle")}</AlertTitle>
          <AlertDescription className="space-y-3 text-amber-700 dark:text-amber-400">
            <p>{t("cancelingWarning", { date: formatDate(profile.current_period_end, locale) })}</p>
            <ResumeProButton />
          </AlertDescription>
        </Alert>
      )}

      {/* No visible heading: the cards self-describe; the label stays for screen readers. */}
      <section aria-label={t("compareTitle")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div
            className={cn(
              "flex flex-col rounded-2xl bg-card p-5",
              !pro ? "border-2 border-brand-primary" : "border border-border"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase">
                {tCommon("free")}
              </h3>
              {!pro && currentPlanBadge}
            </div>
            <p className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-foreground">€0</span>
              <span className="text-xs text-muted-foreground">{tUpgrade("forever")}</span>
            </p>
            {!pro && (
              <p className="mt-2 text-xs text-muted-foreground">
                {tUpgrade("freeUsage", { used: activeInvoiceCount ?? 0, limit: FREE_INVOICE_LIMIT })}
              </p>
            )}
            <PlanFeatureList className="mt-4 flex-1" features={planFeatures.free} {...srLabels} />
            {/* Only a healthy subscription can self-cancel; past_due resolves via Manage billing. */}
            {status === "active" &&
              (canceling ? (
                periodEndLabel && (
                  <p className="mt-4 text-xs text-muted-foreground">
                    {t("switchesOn", { date: periodEndLabel })}
                  </p>
                )
              ) : (
                <div className="mt-4">
                  <DowngradeDialog periodEndLabel={periodEndLabel || null} freeLimit={FREE_INVOICE_LIMIT} />
                </div>
              ))}
          </div>

          <div
            className={cn(
              "flex flex-col rounded-2xl bg-card p-5",
              pro ? "border-2 border-brand-primary" : "border border-border"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-brand-primary uppercase">
                {tCommon("pro")}
              </h3>
              {pro && currentPlanBadge}
            </div>
            <p className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-foreground">{PRO_PRICE_AMOUNT}</span>
              <span className="text-xs text-muted-foreground">{tUpgrade("perMonth")}</span>
            </p>
            {status === "active" && !canceling && nextPaymentDate && (
              <p className="mt-2 text-xs text-muted-foreground">
                {t("nextPayment", { date: formatDate(nextPaymentDate, locale) })}
              </p>
            )}
            <PlanFeatureList
              className="mt-4 flex-1"
              features={planFeatures.pro}
              highlightProOnly
              {...srLabels}
            />
            {pro && (
              <form action={openBillingPortal} className="mt-4">
                <FormSubmitButton blockUi variant="outline" className="w-full">
                  {t("manageBilling")}
                </FormSubmitButton>
              </form>
            )}
            {!pro && (
              <div className="mt-4">
                <form action={startCheckout}>
                  <FormSubmitButton blockUi className="w-full">
                    <Sparkles /> {tUpgrade("cta")}
                  </FormSubmitButton>
                </form>
                <p className="mt-2 text-center text-xs text-muted-foreground">{tUpgrade("note")}</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
