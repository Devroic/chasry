import * as React from "react";
import { AccountLayout, AccountHeading, AccountText, AccountButton } from "./components/account-layout";

// Sent to the owner on an "I've paid" click. English-only, like all account emails.
export default function PaidClaimNotificationEmail({
  appUrl,
  clientName = "A client",
  invoiceLabel = "an invoice",
  amountLabel = "€450.00",
  invoiceId = "",
}: {
  /** Required so a forgotten prop is a compile error, not a localhost link in production. */
  appUrl: string;
  clientName?: string;
  invoiceLabel?: string;
  amountLabel?: string;
  invoiceId?: string;
}) {
  return (
    <AccountLayout previewText={`${clientName} says they've paid ${invoiceLabel}`} appUrl={appUrl}>
      <AccountHeading>{clientName} says they&apos;ve paid</AccountHeading>
      <AccountText>
        {clientName} marked {invoiceLabel} ({amountLabel}) as paid from a reminder email. Reminders
        for it are paused until you confirm. If the money has arrived, mark it as paid; if not, you
        can resume reminders from the invoice page.
      </AccountText>
      <AccountButton href={`${appUrl}/invoices/${invoiceId}`}>Review this invoice</AccountButton>
    </AccountLayout>
  );
}

// Only the `npm run email:dev` preview reads this; real sends pass getAppUrl().
PaidClaimNotificationEmail.PreviewProps = { appUrl: "http://localhost:3000" };
