import * as React from "react";
import { Text } from "@react-email/components";
import { AccountLayout, AccountHeading, AccountText, AccountButton } from "./components/account-layout";

// Sent to the owner when the cron rolls a monthly series. English-only, like all account emails.
export default function RecurringInvoiceCreatedEmail({
  appUrl,
  clientName = "your client",
  amountLabel = "€450.00",
  dueDateLabel = "30 September 2026",
  firstReminderLabel,
  hadAttachment = false,
  invoiceId = "",
}: {
  /** Required so a forgotten prop is a compile error, not a localhost link in production. */
  appUrl: string;
  clientName?: string;
  amountLabel?: string;
  dueDateLabel?: string;
  /** When the first reminder fires; omitted when reminders are off or none are scheduled. */
  firstReminderLabel?: string;
  /** The previous invoice in the series had a PDF attached (not carried over). */
  hadAttachment?: boolean;
  invoiceId?: string;
}) {
  return (
    <AccountLayout
      previewText={`Next month's invoice for ${clientName} is ready`}
      appUrl={appUrl}
    >
      <AccountHeading>Next month&apos;s invoice is ready</AccountHeading>
      <AccountText>
        Chasry created the next invoice in your monthly series for <strong>{clientName}</strong>:{" "}
        {amountLabel}, due {dueDateLabel}.{" "}
        {firstReminderLabel
          ? `Reminders for it start on ${firstReminderLabel}.`
          : "No reminders are currently scheduled for it."}
      </AccountText>
      {hadAttachment && (
        <Text
          style={{
            fontSize: "14px",
            lineHeight: "22px",
            color: "#92400E",
            backgroundColor: "#FEF3C7",
            borderRadius: "8px",
            padding: "12px 16px",
            margin: "0 0 20px",
          }}
        >
          The previous invoice in this series had a PDF attached. Attachments are not carried
          over, so attach the new period&apos;s PDF before reminders begin.
        </Text>
      )}
      <AccountButton href={`${appUrl}/invoices/${invoiceId}`}>Review invoice</AccountButton>
    </AccountLayout>
  );
}

// Only the `npm run email:dev` preview reads this; real sends pass getAppUrl().
RecurringInvoiceCreatedEmail.PreviewProps = { appUrl: "http://localhost:3000" };
