import * as React from "react";
import {
  InvoiceSummary,
  PayNowButton,
  ReminderHeading,
  ReminderLayout,
  ReminderText,
} from "@/emails/components/reminder-layout";

export interface ReminderSeriouslyOverdueProps {
  businessName: string;
  clientName: string;
  invoiceNumber?: string;
  amount: string;
  dueDateLabel: string;
  daysOverdue: number;
  paymentLink?: string;
}

export default function ReminderSeriouslyOverdueEmail({
  businessName = "Acme Design Co.",
  clientName = "Jordan",
  invoiceNumber = "INV-1042",
  amount = "€450.00",
  dueDateLabel = "Was due 20 Jul 2026",
  daysOverdue = 30,
  paymentLink,
}: Partial<ReminderSeriouslyOverdueProps>) {
  return (
    <ReminderLayout
      previewText={`Invoice is now ${daysOverdue} days overdue, please arrange payment`}
      businessName={businessName}
    >
      <ReminderHeading>Hi {clientName}, this payment is significantly overdue</ReminderHeading>
      <ReminderText>
        This invoice from {businessName} was due {daysOverdue} days ago. Please arrange payment as
        soon as possible, or reply to this email if there&rsquo;s an issue we should know about.
      </ReminderText>
      <InvoiceSummary invoiceNumber={invoiceNumber} amount={amount} dueDateLabel={dueDateLabel} />
      {paymentLink && <PayNowButton href={paymentLink} />}
      <ReminderText>We&rsquo;d appreciate this being resolved promptly.</ReminderText>
    </ReminderLayout>
  );
}
