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

export interface ReminderBeforeDueProps {
  businessName: string;
  invoiceNumber?: string;
  amount: string;
  dueDateLabel: string;
  daysUntilDue: number;
  paymentLink?: string;
  locale?: Locale;
  showBranding?: boolean;
  claimUrl?: string;
}

export default function ReminderBeforeDueEmail({
  businessName = "Acme Design Co.",
  invoiceNumber,
  amount = "€450.00",
  dueDateLabel = "Due 29 Aug 2026",
  daysUntilDue = 7,
  paymentLink,
  locale = "en",
  showBranding = true,
  claimUrl,
}: Partial<ReminderBeforeDueProps>) {
  const dueClause = emailCopy.beforeDue.dueClause(daysUntilDue, locale);

  return (
    <ReminderLayout
      previewText={emailCopy.beforeDue.previewText(dueClause, locale)}
      businessName={businessName}
      locale={locale}
      showBranding={showBranding}
      claimUrl={claimUrl}
    >
      <ReminderHeading>{emailCopy.beforeDue.heading(locale)}</ReminderHeading>
      <ReminderText>{emailCopy.beforeDue.body(businessName, dueClause, locale)}</ReminderText>
      <InvoiceSummary
        invoiceNumber={invoiceNumber}
        amount={amount}
        dueDateLabel={dueDateLabel}
        locale={locale}
      />
      {paymentLink && <PayNowButton href={paymentLink} locale={locale} />}
      <ReminderText>{emailCopy.beforeDue.closing(locale)}</ReminderText>
    </ReminderLayout>
  );
}
