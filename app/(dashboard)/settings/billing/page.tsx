import { requireUser } from "@/lib/auth";
import { isPro, planLabel, FREE_INVOICE_LIMIT, PRO_PRICE_LABEL } from "@/lib/plan";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { startCheckout, openBillingPortal } from "./actions";

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  past_due: "Payment failed — updating",
  canceled: "Canceled",
};

export default async function BillingSettingsPage() {
  const { supabase, user } = await requireUser();

  const [{ data: profile }, { count: activeInvoiceCount }] = await Promise.all([
    supabase
      .from("profiles")
      .select("subscription_status, current_period_end, stripe_customer_id")
      .eq("id", user.id)
      .single(),
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "unpaid"),
  ]);

  const status = profile?.subscription_status ?? "none";
  const pro = isPro(status);

  return (
    <div className="space-y-6">
      {status === "past_due" && (
        <Alert variant="destructive">
          <AlertDescription>
            Your last payment failed. Update your card from Manage billing below to keep Pro
            active — you&rsquo;ll drop back to the free plan&rsquo;s {FREE_INVOICE_LIMIT}-invoice
            limit if it isn&rsquo;t resolved.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Chasry plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">
                {pro ? `Pro — ${PRO_PRICE_LABEL}` : "Free"}
              </p>
              <p className="text-xs text-muted-foreground">
                {pro
                  ? "Unlimited clients and invoices."
                  : `Up to ${FREE_INVOICE_LIMIT} active invoices at a time (${activeInvoiceCount ?? 0} used). Unlimited clients.`}
              </p>
            </div>
            <Badge variant="outline">{pro ? (STATUS_LABEL[status] ?? status) : planLabel(status)}</Badge>
          </div>

          {status === "active" && profile?.current_period_end && (
            <p className="text-xs text-muted-foreground">
              Renews {formatDate(profile.current_period_end)}.
            </p>
          )}

          {pro ? (
            <form action={openBillingPortal}>
              <Button type="submit" variant="outline">
                Manage billing
              </Button>
            </form>
          ) : (
            <form action={startCheckout}>
              <Button type="submit">Upgrade to Pro</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
