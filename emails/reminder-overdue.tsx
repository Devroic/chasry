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

export interface ReminderOverdueProps {
  businessName: string;
  invoiceNumber?: string;
  amount: string;
  dueDateLabel: string;
  daysOverdue: number;
  paymentLink?: string;
  locale?: Locale;
  showBranding?: boolean;
  claimUrl?: string;
}

export default function ReminderOverdueEmail({
  businessName = "Acme Design Co.",
  invoiceNumber,
  amount = "€450.00",
  dueDateLabel = "Was due 15 Aug 2026",
  daysOverdue = 1,
  paymentLink,
  locale = "en",
  showBranding = true,
  claimUrl,
}: Partial<ReminderOverdueProps>) {
  return (
    <ReminderLayout
      previewText={emailCopy.overdue.previewText(daysOverdue, locale)}
      businessName={businessName}
      locale={locale}
      showBranding={showBranding}
      claimUrl={claimUrl}
    >
      <ReminderHeading>{emailCopy.overdue.heading(locale)}</ReminderHeading>
      <ReminderText>{emailCopy.overdue.body(businessName, daysOverdue, locale)}</ReminderText>
      <InvoiceSummary
        invoiceNumber={invoiceNumber}
        amount={amount}
        dueDateLabel={dueDateLabel}
        locale={locale}
      />
      {paymentLink && <PayNowButton href={paymentLink} locale={locale} />}
      <ReminderText>{emailCopy.overdue.closing(locale)}</ReminderText>
    </ReminderLayout>
  );
}
