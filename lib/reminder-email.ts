import * as React from "react";
import { toneForOffset } from "@/lib/reminders";
import { formatDate, formatMoney, daysUntil } from "@/lib/format";
import ReminderBeforeDueEmail from "@/emails/reminder-before-due";
import ReminderOverdueEmail from "@/emails/reminder-overdue";
import ReminderSeriouslyOverdueEmail from "@/emails/reminder-seriously-overdue";

// Picks the right template/subject for a reminder offset. Shared by the real cron
// send and the preview action, so a preview can never differ from the real email.
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
}): { element: React.ReactElement; subject: string } {
  const tone = toneForOffset(offsetDays);
  const amountLabel = formatMoney(amount, currency);
  const dueDateFormatted = formatDate(dueDate);
  const invoiceNum = invoiceNumber ?? undefined;

  // The day-count shown reflects today vs. the due date, not the configured
  // offset — those can drift if the cron sends late. `offsetDays` only picks the tone/template.
  const daysUntilDue = daysUntil(dueDate);

  const element =
    tone === "seriously_overdue"
      ? ReminderSeriouslyOverdueEmail({
          businessName,
          clientName,
          invoiceNumber: invoiceNum,
          amount: amountLabel,
          dueDateLabel: `Was due ${dueDateFormatted}`,
          daysOverdue: Math.max(1, -daysUntilDue),
          paymentLink,
        })
      : tone === "overdue"
        ? ReminderOverdueEmail({
            businessName,
            clientName,
            invoiceNumber: invoiceNum,
            amount: amountLabel,
            dueDateLabel: `Was due ${dueDateFormatted}`,
            daysOverdue: Math.max(1, -daysUntilDue),
            paymentLink,
          })
        : ReminderBeforeDueEmail({
            businessName,
            clientName,
            invoiceNumber: invoiceNum,
            amount: amountLabel,
            dueDateLabel: `${daysUntilDue < 0 ? "Was due" : "Due"} ${dueDateFormatted}`,
            daysUntilDue,
            paymentLink,
          });

  const invoiceRef = invoiceNum ? `invoice ${invoiceNum}` : "invoice";
  // "due soon" is only accurate with time left — same-day/late "before" sends need their own subject.
  const beforeDueSubject =
    daysUntilDue > 0
      ? `${subjectPrefix}Reminder: ${invoiceRef} due soon from ${businessName}`
      : daysUntilDue === 0
        ? `${subjectPrefix}Reminder: ${invoiceRef} due today from ${businessName}`
        : `${subjectPrefix}Reminder: ${invoiceRef} was due recently from ${businessName}`;
  const subject =
    tone === "seriously_overdue"
      ? `${subjectPrefix}Please arrange payment: ${invoiceRef} from ${businessName}`
      : tone === "overdue"
        ? `${subjectPrefix}Overdue: ${invoiceRef} from ${businessName}`
        : beforeDueSubject;

  return { element, subject };
}
