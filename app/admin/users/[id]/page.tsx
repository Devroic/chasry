import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { BackLink } from "@/components/dashboard/back-link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LinkStripeCustomerForm } from "@/components/admin/link-stripe-customer-form";
import { formatDate } from "@/lib/format";
import { getNextRealPaymentDate } from "@/lib/billing";
import { isPro } from "@/lib/plan";

const STATUS_LABEL: Record<string, string> = {
  active: "Pro",
  past_due: "Past due",
  canceled: "Canceled",
  none: "Free",
};

const STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  past_due: "bg-red-50 text-red-700 border-red-200",
};

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminClient();

  const [{ data: profile }, { count: activeInvoiceCount }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, business_name, email, subscription_status, stripe_customer_id, stripe_subscription_id, current_period_end, onboarded_at, created_at"
      )
      .eq("id", id)
      .single(),
    supabase.from("invoices").select("id", { count: "exact", head: true }).eq("user_id", id).eq("status", "unpaid"),
  ]);

  if (!profile) notFound();

  const pro = isPro(profile.subscription_status);
  const nextPaymentDate =
    profile.subscription_status === "active" && profile.stripe_subscription_id
      ? ((await getNextRealPaymentDate(profile.stripe_subscription_id)) ?? profile.current_period_end)
      : profile.current_period_end;

  return (
    <div>
      <BackLink href="/admin/users" label="Users" />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-foreground">
          {profile.business_name || profile.email}
        </h1>
        <Badge
          variant="outline"
          className={pro ? STATUS_STYLE[profile.subscription_status] : undefined}
        >
          {STATUS_LABEL[profile.subscription_status] ?? profile.subscription_status}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 text-sm">
            <Row label="Email" value={profile.email} />
            <Row label="Active invoices" value={String(activeInvoiceCount ?? 0)} />
            <Row label="Onboarded" value={profile.onboarded_at ? formatDate(profile.onboarded_at) : "Not yet"} />
            <Row label="Joined" value={formatDate(profile.created_at)} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 text-sm">
            <Row label="Plan" value={STATUS_LABEL[profile.subscription_status] ?? profile.subscription_status} />
            <Row label="Next payment" value={nextPaymentDate ? formatDate(nextPaymentDate) : "None scheduled"} />
            <Row
              label="Stripe subscription"
              value={profile.stripe_subscription_id ?? "None"}
              mono
            />
            <Row
              label="Stripe customer"
              value={
                profile.stripe_customer_id ? (
                  <a
                    href={`https://dashboard.stripe.com/customers/${profile.stripe_customer_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-brand-primary hover:underline"
                  >
                    {profile.stripe_customer_id}
                  </a>
                ) : (
                  "None linked yet"
                )
              }
            />
          </CardContent>
        </Card>
      </div>

      {!profile.stripe_customer_id && (
        <Card className="mt-4">
          <CardContent>
            <p className="mb-3 text-sm font-medium text-foreground">Link a Stripe customer</p>
            <LinkStripeCustomerForm userId={profile.id} />
          </CardContent>
        </Card>
      )}
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
