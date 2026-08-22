import * as React from "react";
import {
  InvoiceSummary,
  ReminderHeading,
  ReminderLayout,
  ReminderText,
} from "@/emails/components/reminder-layout";

export interface ReminderOverdueProps {
  businessName: string;
  clientName: string;
  invoiceNumber?: string;
  amount: string;
  dueDateLabel: string;
  daysOverdue: number;
}

export default function ReminderOverdueEmail({
  businessName = "Acme Design Co.",
  clientName = "Jordan",
  invoiceNumber = "INV-1042",
  amount = "€450.00",
  dueDateLabel = "Was due 15 Aug 2026",
  daysOverdue = 1,
}: Partial<ReminderOverdueProps>) {
  const dayWord = daysOverdue === 1 ? "day" : "days";

  return (
    <ReminderLayout
      previewText={`Invoice is now ${daysOverdue} ${dayWord} overdue`}
      businessName={businessName}
    >
      <ReminderHeading>Hi {clientName}, this invoice is now overdue</ReminderHeading>
      <ReminderText>
        This invoice from {businessName} was due {daysOverdue} {dayWord} ago and hasn&rsquo;t
        been marked as paid yet. If you&rsquo;ve already sent payment, thank you — feel free to
        ignore this. Otherwise, please arrange payment when you get a chance.
      </ReminderText>
      <InvoiceSummary invoiceNumber={invoiceNumber} amount={amount} dueDateLabel={dueDateLabel} />
      <ReminderText>Thanks for your business.</ReminderText>
    </ReminderLayout>
  );
}
