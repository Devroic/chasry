import { getTranslations } from "next-intl/server";
import { PublicCardShell, PublicStatusCard } from "@/components/public-card-shell";
import { FormSubmitButton } from "@/components/form-submit-button";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyInvoiceLink } from "@/lib/link-token";
import { formatMoney } from "@/lib/format";
import { confirmMarkPaidFromEmail } from "./actions";

export const metadata = { title: "Mark as paid" };

/**
 * Landing page for the weekly digest's "mark as paid" links. The mutation happens on the confirm
 * POST, never on this GET, because email scanners prefetch links.
 */
export default async function MarkPaidFromEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  const t = await getTranslations("emailLinks.markPaid");
  const invoiceId = verifyInvoiceLink("mark-paid", token);

  let content: React.ReactNode;

  if (!invoiceId) {
    content = <PublicStatusCard title={t("invalidTitle")} body={t("invalidBody")} />;
  } else {
    const supabase = createAdminClient();
    const { data: invoice } = await supabase
      .from("invoices")
      .select("id, invoice_number, amount, currency, status, customer_id")
      .eq("id", invoiceId)
      .single();
    const { data: customer } = invoice
      ? await supabase.from("customers").select("name").eq("id", invoice.customer_id).single()
      : { data: null };

    if (!invoice) {
      content = <PublicStatusCard title={t("invalidTitle")} body={t("invalidBody")} />;
    } else if (invoice.status === "paid") {
      content = <PublicStatusCard success title={t("doneTitle")} body={t("doneBody")} />;
    } else {
      const reference = [customer?.name, invoice.invoice_number].filter(Boolean).join(" · ");
      content = (
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{t("title")}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{t("subtitle")}</p>
          <div className="mt-6 rounded-xl bg-brand-primary-tint px-5 py-4">
            {reference && <p className="text-xs text-muted-foreground">{reference}</p>}
            <p className="text-2xl font-semibold text-brand-primary">
              {formatMoney(Number(invoice.amount), invoice.currency)}
            </p>
          </div>
          <form
            action={async () => {
              "use server";
              await confirmMarkPaidFromEmail(token);
            }}
            className="mt-6"
          >
            <FormSubmitButton blockUi className="h-11 w-full text-base font-semibold">
              {t("confirm")}
            </FormSubmitButton>
          </form>
        </div>
      );
    }
  }

  return <PublicCardShell>{content}</PublicCardShell>;
}
