"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { HandCoins, Check, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { BlockingOverlay } from "@/components/blocking-overlay";
import { markInvoicePaid, dismissPaidClaim } from "@/app/(dashboard)/invoices/actions";

/** Shown when the client clicked "I've paid"; reminders stay paused until confirmed or dismissed. */
export function PaidClaimBanner({
  invoiceId,
  clientName,
  claimedAtLabel,
}: {
  invoiceId: string;
  clientName: string;
  claimedAtLabel: string;
}) {
  const t = useTranslations("invoices.paidClaim");
  const tActions = useTranslations("invoices.actions");
  // Two transitions so only the clicked button shows its spinner.
  const [confirmPending, startConfirm] = useTransition();
  const [dismissPending, startDismiss] = useTransition();
  const pending = confirmPending || dismissPending;

  return (
    <Alert className="mb-6 border-brand-secondary-tint bg-brand-primary-tint">
      <BlockingOverlay show={pending} spinner={false} />
      <HandCoins className="text-brand-primary" />
      <AlertTitle className="text-brand-primary">
        {t("title", { name: clientName, date: claimedAtLabel })}
      </AlertTitle>
      <AlertDescription className="text-brand-primary/80">
        <p>{t("description")}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            size="sm"
            loading={confirmPending}
            disabled={pending}
            onClick={() =>
              startConfirm(async () => {
                const result = await markInvoicePaid(invoiceId);
                if (result?.error) toast.error(result.error);
                else toast.success(tActions("markPaidToast"));
              })
            }
          >
            <Check /> {tActions("markPaid")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            loading={dismissPending}
            disabled={pending}
            onClick={() =>
              startDismiss(async () => {
                const result = await dismissPaidClaim(invoiceId);
                if (result?.error) toast.error(result.error);
                else toast.info(t("dismissedToast"));
              })
            }
          >
            <X /> {t("dismiss")}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
