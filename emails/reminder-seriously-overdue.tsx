import * as React from "react";
import {
  InvoiceSummary,
  PayNowButton,
  ReminderHeading,
  ReminderLayout,
  ReminderText,
} from "@/emails/components/reminder-layout";
import { emailCopy } from "@/emails/copy";
import type { Locale } from "@/lib/locale";

export interface ReminderSeriouslyOverdueProps {
  businessName: string;
  clientName: string;
  invoiceNumber?: string;
  amount: string;
  dueDateLabel: string;
  daysOverdue: number;
  paymentLink?: string;
  locale?: Locale;
}

export default function ReminderSeriouslyOverdueEmail({
  businessName = "Acme Design Co.",
  clientName = "Jordan",
  invoiceNumber,
  amount = "€450.00",
  dueDateLabel = "Was due 20 Jul 2026",
  daysOverdue = 30,
  paymentLink,
  locale = "en",
}: Partial<ReminderSeriouslyOverdueProps>) {
  return (
    <ReminderLayout
      previewText={emailCopy.seriouslyOverdue.previewText(daysOverdue, locale)}
      businessName={businessName}
      locale={locale}
    >
      <ReminderHeading>{emailCopy.seriouslyOverdue.heading(clientName, locale)}</ReminderHeading>
      <ReminderText>{emailCopy.seriouslyOverdue.body(businessName, daysOverdue, locale)}</ReminderText>
      <InvoiceSummary
        invoiceNumber={invoiceNumber}
        amount={amount}
        dueDateLabel={dueDateLabel}
        locale={locale}
      />
      {paymentLink && <PayNowButton href={paymentLink} locale={locale} />}
      <ReminderText>{emailCopy.seriouslyOverdue.closing(locale)}</ReminderText>
    </ReminderLayout>
  );
}
