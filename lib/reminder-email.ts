import * as React from "react";
import { toneForOffset } from "@/lib/reminders";
import { formatDate, formatMoney } from "@/lib/format";
import ReminderBeforeDueEmail from "@/emails/reminder-before-due";
import ReminderOverdueEmail from "@/emails/reminder-overdue";
import ReminderSeriouslyOverdueEmail from "@/emails/reminder-seriously-overdue";

/**
 * Picks the right template/subject for a reminder offset and fills it in.
 * Shared by the real cron send (app/api/cron/send-reminders) and the
 * "send me a preview" action, so a preview can never show a different
 * email than what actually goes out for that offset.
 */
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

  const element =
    tone === "seriously_overdue"
      ? ReminderSeriouslyOverdueEmail({
          businessName,
          clientName,
          invoiceNumber: invoiceNum,
          amount: amountLabel,
          dueDateLabel: `Was due ${dueDateFormatted}`,
          daysOverdue: offsetDays,
          paymentLink,
        })
      : tone === "overdue"
        ? ReminderOverdueEmail({
            businessName,
            clientName,
            invoiceNumber: invoiceNum,
            amount: amountLabel,
            dueDateLabel: `Was due ${dueDateFormatted}`,
            daysOverdue: offsetDays,
            paymentLink,
          })
        : ReminderBeforeDueEmail({
            businessName,
            clientName,
            invoiceNumber: invoiceNum,
            amount: amountLabel,
            dueDateLabel: `Due ${dueDateFormatted}`,
            daysUntilDue: -offsetDays,
            paymentLink,
          });

  // `invoiceNum` is optional (not every invoice has a number set) — build
  // the reference without it rather than leaving a double space where it
  // would have gone.
  const invoiceRef = invoiceNum ? `invoice ${invoiceNum}` : "invoice";
  const subject =
    tone === "seriously_overdue"
      ? `${subjectPrefix}Please arrange payment: ${invoiceRef} from ${businessName}`
      : tone === "overdue"
        ? `${subjectPrefix}Overdue: ${invoiceRef} from ${businessName}`
        : `${subjectPrefix}Reminder: ${invoiceRef} due soon from ${businessName}`;

  return { element, subject };
}
