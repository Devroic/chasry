import { PublicCardShell, PublicStatusCard } from "@/components/public-card-shell";
import { FormSubmitButton } from "@/components/form-submit-button";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyInvoiceLink } from "@/lib/link-token";
import { formatDate, formatMoney } from "@/lib/format";
import { claimCopy } from "@/lib/claim-copy";
import { claimInvoicePaid } from "./actions";
import type { Locale } from "@/lib/locale";

export const metadata = { title: "Confirm payment" };

/**
 * Public page a client reaches from a reminder email's "I've paid" link. The signed token both
 * authenticates and scopes the request to one invoice.
 */
export default async function ClaimPaidPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invoiceId = verifyInvoiceLink("claim-paid", decodeURIComponent(token));

  let content: React.ReactNode;

  if (!invoiceId) {
    content = (
      <PublicStatusCard title={claimCopy.invalidTitle("en")} body={claimCopy.invalidBody("en")} />
    );
  } else {
    const supabase = createAdminClient();
    const { data: invoice } = await supabase
      .from("invoices")
      .select("id, invoice_number, amount, currency, due_date, status, paid_claimed_at, user_id, customer_id")
      .eq("id", invoiceId)
      .single();

    if (!invoice) {
      content = (
        <PublicStatusCard title={claimCopy.invalidTitle("en")} body={claimCopy.invalidBody("en")} />
      );
    } else {
      const [{ data: profile }, { data: customer }] = await Promise.all([
        supabase
          .from("profiles")
          .select("business_name, email, reminder_locale")
          .eq("id", invoice.user_id)
          .single(),
        supabase
          .from("customers")
          .select("reminder_locale")
          .eq("id", invoice.customer_id)
          .single(),
      ]);

      const locale: Locale = customer?.reminder_locale ?? profile?.reminder_locale ?? "en";
      const businessName = profile?.business_name || profile?.email || "the sender";

      if (invoice.status === "paid") {
        content = (
          <PublicStatusCard
            success
            title={claimCopy.alreadyPaidTitle(locale)}
            body={claimCopy.alreadyPaidBody(businessName, locale)}
          />
        );
      } else if (invoice.paid_claimed_at) {
        content = (
          <PublicStatusCard
            success
            title={claimCopy.doneTitle(locale)}
            body={claimCopy.doneBody(businessName, locale)}
          />
        );
      } else {
        content = (
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              {claimCopy.title(locale)}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {claimCopy.intro(businessName, locale)}
            </p>
            <div className="mt-6 rounded-xl bg-brand-primary-tint px-5 py-4">
              <p className="text-xs text-muted-foreground">
                {claimCopy.invoiceLabel(locale)}
                {invoice.invoice_number ? ` ${invoice.invoice_number}` : ""}
              </p>
              <p className="text-2xl font-semibold text-brand-primary">
                {formatMoney(Number(invoice.amount), invoice.currency)}
              </p>
              <p className="text-xs text-muted-foreground">{formatDate(invoice.due_date, locale)}</p>
            </div>
            <form
              action={async () => {
                "use server";
                await claimInvoicePaid(decodeURIComponent(token));
              }}
              className="mt-6"
            >
              <FormSubmitButton blockUi className="h-11 w-full text-base font-semibold">
                {claimCopy.button(locale)}
              </FormSubmitButton>
            </form>
          </div>
        );
      }
    }
  }

  return <PublicCardShell>{content}</PublicCardShell>;
}
