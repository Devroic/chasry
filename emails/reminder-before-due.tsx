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
  invoiceNumber = "INV-1042",
  amount = "€450.00",
  dueDateLabel = "Due 29 Aug 2026",
  daysUntilDue = 7,
  paymentLink,
}: Partial<ReminderBeforeDueProps>) {
  const dayWord = daysUntilDue === 1 ? "day" : "days";

  return (
    <ReminderLayout
      previewText={`Friendly reminder: invoice due in ${daysUntilDue} ${dayWord}`}
      businessName={businessName}
    >
      <ReminderHeading>Hi {clientName}, just a friendly reminder</ReminderHeading>
      <ReminderText>
        This invoice from {businessName} is due in {daysUntilDue} {dayWord}. No action needed if
        it&rsquo;s already scheduled — this is just a heads-up.
      </ReminderText>
      <InvoiceSummary invoiceNumber={invoiceNumber} amount={amount} dueDateLabel={dueDateLabel} />
      {paymentLink && <PayNowButton href={paymentLink} />}
      <ReminderText>Thanks for your business.</ReminderText>
    </ReminderLayout>
  );
}
