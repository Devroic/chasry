import Link from "next/link";
import { Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireOnboardedUser } from "@/lib/auth";
import { isPro, FREE_INVOICE_LIMIT } from "@/lib/plan";
import { StatCard } from "@/components/stat-card";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { InvoiceListItem } from "@/components/dashboard/invoice-list-item";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { formatMoney, todayInTimeZone } from "@/lib/format";
import { getUserTimeZone } from "@/lib/timezone";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string }>;
}) {
  const { upgraded } = await searchParams;
  const { supabase, user, profile } = await requireOnboardedUser();
  const t = await getTranslations("dashboard");

  // One parallel batch: client lists are small, so names are fetched up front.
  const [{ data: unpaidInvoices }, { data: customers, count: customerCount }, { count: invoiceCount }] =
    await Promise.all([
      supabase
        .from("invoices")
        .select("id, amount, currency, due_date, invoice_number, customer_id")
        .eq("user_id", user.id)
        .eq("status", "unpaid")
        .order("due_date", { ascending: true }),
      supabase
        .from("customers")
        .select("id, name", { count: "exact" })
        .eq("user_id", user.id),
      supabase
        .from("invoices")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);

  // "Overdue" follows the viewer's calendar day (tz cookie), not UTC's.
  const timeZone = await getUserTimeZone();
  const today = new Date(`${todayInTimeZone(timeZone)}T00:00:00Z`);

  const invoices = unpaidInvoices ?? [];
  const overdue = invoices.filter((i) => new Date(i.due_date) < today);
  const totalOutstanding = invoices.reduce((sum, i) => sum + Number(i.amount), 0);
  const currency = profile?.currency ?? "EUR";
  const upcoming = invoices.filter((i) => new Date(i.due_date) >= today).slice(0, 5);

  const customerName = new Map((customers ?? []).map((c) => [c.id, c.name]));

  const showChecklist = (customerCount ?? 0) === 0 || (invoiceCount ?? 0) === 0;
  const pro = isPro(profile?.subscription_status ?? "none");

  return (
    <div className="space-y-8">
      {upgraded && pro && (
        <Alert className="border-brand-secondary-tint bg-brand-primary-tint px-4 py-3.5">
          <Sparkles className="text-brand-primary" />
          <AlertTitle className="text-base font-semibold text-brand-primary">
            {t("upgradedBannerTitle")}
          </AlertTitle>
          <AlertDescription className="text-brand-primary/80">
            {t("upgradedBanner")}
          </AlertDescription>
        </Alert>
      )}

      <PageHeader title={t("title")} description={t("subtitle")} className="mb-0" />

      {showChecklist && (
        <OnboardingChecklist
          hasCustomer={(customerCount ?? 0) > 0}
          hasInvoice={(invoiceCount ?? 0) > 0}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={t("statOutstanding")} value={formatMoney(totalOutstanding, currency)} />
        <StatCard
          label={t("statOverdue")}
          value={String(overdue.length)}
          tone={overdue.length > 0 ? "warning" : "default"}
        />
        <StatCard
          label={t("statUnpaid")}
          value={String(invoices.length)}
          hint={
            !pro
              ? t("freeLimitHint", { count: invoices.length, limit: FREE_INVOICE_LIMIT })
              : undefined
          }
          tone={!pro && invoices.length >= FREE_INVOICE_LIMIT ? "warning" : "default"}
        />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">{t("dueSoon")}</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/invoices">{t("viewAll")}</Link>
          </Button>
        </div>

        {invoices.length === 0 ? (
          <EmptyState
            title={t("emptyTitle")}
            description={t("emptyDescription")}
            actionLabel={t("emptyCta")}
            actionHref="/invoices/new"
          />
        ) : (
          <Card className="divide-y divide-border p-0">
            {(overdue.length > 0 ? [...overdue, ...upcoming] : upcoming).map((invoice) => (
              <InvoiceListItem
                key={invoice.id}
                id={invoice.id}
                customerName={customerName.get(invoice.customer_id) ?? t("clientFallback")}
                invoiceNumber={invoice.invoice_number}
                dueDate={invoice.due_date}
                amount={Number(invoice.amount)}
                currency={invoice.currency}
                status="unpaid"
              />
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
