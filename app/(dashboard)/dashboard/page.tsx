import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth";
import { isPro, FREE_INVOICE_LIMIT } from "@/lib/plan";
import { StatCard } from "@/components/dashboard/stat-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { InvoiceStatusBadge } from "@/components/dashboard/invoice-status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatDate, formatMoney } from "@/lib/format";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string }>;
}) {
  const { upgraded } = await searchParams;
  const { supabase, user, profile } = await requireOnboardedUser();

  const [{ data: unpaidInvoices }, { count: customerCount }, { count: invoiceCount }] =
    await Promise.all([
      supabase
        .from("invoices")
        .select("id, amount, currency, due_date, invoice_number, customer_id")
        .eq("user_id", user.id)
        .eq("status", "unpaid")
        .order("due_date", { ascending: true }),
      supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("invoices")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const invoices = unpaidInvoices ?? [];
  const overdue = invoices.filter((i) => new Date(i.due_date) < today);
  const totalOutstanding = invoices.reduce((sum, i) => sum + Number(i.amount), 0);
  const currency = profile?.currency ?? "EUR";
  const upcoming = invoices.filter((i) => new Date(i.due_date) >= today).slice(0, 5);

  const customerIds = [...new Set(invoices.map((i) => i.customer_id))];
  const { data: customers } = customerIds.length
    ? await supabase.from("customers").select("id, name").in("id", customerIds)
    : { data: [] };
  const customerName = new Map((customers ?? []).map((c) => [c.id, c.name]));

  const showChecklist = (customerCount ?? 0) === 0 || (invoiceCount ?? 0) === 0;
  const pro = isPro(profile?.subscription_status ?? "none");

  return (
    <div className="space-y-8">
      {upgraded && pro && (
        <Alert className="border-brand-secondary-tint bg-brand-primary-tint">
          <AlertDescription className="text-brand-primary">
            You&rsquo;re on Pro now — unlimited clients and invoices.
          </AlertDescription>
        </Alert>
      )}

      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&rsquo;s what&rsquo;s outstanding right now.
        </p>
      </div>

      {showChecklist && (
        <OnboardingChecklist
          hasCustomer={(customerCount ?? 0) > 0}
          hasInvoice={(invoiceCount ?? 0) > 0}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Outstanding" value={formatMoney(totalOutstanding, currency)} />
        <StatCard
          label="Overdue invoices"
          value={String(overdue.length)}
          tone={overdue.length > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Unpaid invoices"
          value={String(invoices.length)}
          hint={!pro ? `${invoices.length} of ${FREE_INVOICE_LIMIT} on the free plan` : undefined}
          tone={!pro && invoices.length >= FREE_INVOICE_LIMIT ? "warning" : "default"}
        />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Due soon</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/invoices">View all</Link>
          </Button>
        </div>

        {invoices.length === 0 ? (
          <EmptyState
            title="No unpaid invoices yet"
            description="Log your first invoice and Chasry will start chasing it for you automatically."
            actionLabel="Add an invoice"
            actionHref="/invoices/new"
          />
        ) : (
          <Card className="divide-y divide-border p-0">
            {(overdue.length > 0 ? [...overdue, ...upcoming] : upcoming).map((invoice) => (
              <Link
                key={invoice.id}
                href={`/invoices/${invoice.id}`}
                className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-muted/50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {customerName.get(invoice.customer_id) ?? "Client"}
                    {invoice.invoice_number ? ` · ${invoice.invoice_number}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">Due {formatDate(invoice.due_date)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-medium text-foreground">
                    {formatMoney(Number(invoice.amount), invoice.currency)}
                  </span>
                  <InvoiceStatusBadge status="unpaid" dueDate={invoice.due_date} />
                </div>
              </Link>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
