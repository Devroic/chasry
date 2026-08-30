import * as React from "react";
import { toneForOffset } from "@/lib/reminders";
import { formatDate, formatMoney, daysUntil } from "@/lib/format";
import ReminderBeforeDueEmail from "@/emails/reminder-before-due";
import ReminderOverdueEmail from "@/emails/reminder-overdue";
import ReminderSeriouslyOverdueEmail from "@/emails/reminder-seriously-overdue";
import { emailCopy } from "@/emails/copy";
import type { Locale } from "@/lib/locale";

// Shared by the real cron send and the preview action, so previews can't drift from real emails.
export function buildReminderEmail({
  offsetDays,
  businessName,
  clientName,
  invoiceNumber,
  amount,
  currency,
  dueDate,
  paymentLink,
  subjectPrefix = "",
  locale = "en",
}: {
  offsetDays: number;
  businessName: string;
  clientName: string;
  invoiceNumber?: string | null;
  amount: number;
  currency: string;
  dueDate: string;
  paymentLink?: string;
  subjectPrefix?: string;
  locale?: Locale;
}): { element: React.ReactElement; subject: string } {
  const tone = toneForOffset(offsetDays);
  const amountLabel = formatMoney(amount, currency);
  const dueDateFormatted = formatDate(dueDate, locale);
  const invoiceNum = invoiceNumber ?? undefined;

  // Day-count reflects today vs. due date; offsetDays only picks the tone/template.
  const daysUntilDue = daysUntil(dueDate);

  const element =
    tone === "seriously_overdue"
      ? ReminderSeriouslyOverdueEmail({
          businessName,
          clientName,
          invoiceNumber: invoiceNum,
          amount: amountLabel,
          dueDateLabel: emailCopy.wasDueLabel(dueDateFormatted, locale),
          daysOverdue: Math.max(1, -daysUntilDue),
          paymentLink,
          locale,
        })
      : tone === "overdue"
        ? ReminderOverdueEmail({
            businessName,
            clientName,
            invoiceNumber: invoiceNum,
            amount: amountLabel,
            dueDateLabel: emailCopy.wasDueLabel(dueDateFormatted, locale),
            daysOverdue: Math.max(1, -daysUntilDue),
            paymentLink,
            locale,
          })
        : ReminderBeforeDueEmail({
            businessName,
            clientName,
            invoiceNumber: invoiceNum,
            amount: amountLabel,
            dueDateLabel:
              daysUntilDue < 0
                ? emailCopy.wasDueLabel(dueDateFormatted, locale)
                : emailCopy.dueLabel(dueDateFormatted, locale),
            daysUntilDue,
            paymentLink,
            locale,
          });

  const invoiceRef = emailCopy.subject.invoiceRef(invoiceNum, locale);
  // "due soon" is only accurate with time left — same-day/late "before" sends need their own subject.
  const beforeDueSubject =
    daysUntilDue > 0
      ? emailCopy.subject.dueSoon(subjectPrefix, invoiceRef, businessName, locale)
      : daysUntilDue === 0
        ? emailCopy.subject.dueToday(subjectPrefix, invoiceRef, businessName, locale)
        : emailCopy.subject.dueRecently(subjectPrefix, invoiceRef, businessName, locale);
  const subject =
    tone === "seriously_overdue"
      ? emailCopy.subject.seriouslyOverdue(subjectPrefix, invoiceRef, businessName, locale)
      : tone === "overdue"
        ? emailCopy.subject.overdue(subjectPrefix, invoiceRef, businessName, locale)
        : beforeDueSubject;

  return { element, subject };
}
