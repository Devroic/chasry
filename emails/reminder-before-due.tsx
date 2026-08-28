import * as React from "react";
import {
  InvoiceSummary,
  PayNowButton,
  ReminderHeading,
  ReminderLayout,
  ReminderText,
} from "@/emails/components/reminder-layout";

export interface ReminderBeforeDueProps {
  businessName: string;
  clientName: string;
  invoiceNumber?: string;
  amount: string;
  dueDateLabel: string;
  daysUntilDue: number;
  paymentLink?: string;
}

export default function ReminderBeforeDueEmail({
  businessName = "Acme Design Co.",
  clientName = "Jordan",
  invoiceNumber,
  amount = "€450.00",
  dueDateLabel = "Due 29 Aug 2026",
  daysUntilDue = 7,
  paymentLink,
}: Partial<ReminderBeforeDueProps>) {
  // Can go negative if the due date has technically passed by send time — the verb
  // changes tense (is due / was due) so the sentence stays grammatical.
  const dueClause =
    daysUntilDue > 0
      ? `is due in ${daysUntilDue} ${daysUntilDue === 1 ? "day" : "days"}`
      : daysUntilDue === 0
        ? "is due today"
        : `was due ${-daysUntilDue} ${-daysUntilDue === 1 ? "day" : "days"} ago`;

  return (
    <ReminderLayout
      previewText={`Friendly reminder: invoice ${dueClause}`}
      businessName={businessName}
    >
      <ReminderHeading>Hi {clientName}, just a friendly reminder</ReminderHeading>
      <ReminderText>
        This invoice from {businessName} {dueClause}. No action needed if it&rsquo;s already
        scheduled, this is just a heads-up.
      </ReminderText>
      <InvoiceSummary invoiceNumber={invoiceNumber} amount={amount} dueDateLabel={dueDateLabel} />
      {paymentLink && <PayNowButton href={paymentLink} />}
      <ReminderText>Thanks for your business.</ReminderText>
    </ReminderLayout>
  );
}
