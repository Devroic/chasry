import * as React from "react";
import { toneForOffset } from "@/lib/reminders";
import { formatDate, formatMoney, daysUntil } from "@/lib/format";
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

  // The day-count in the email body reflects how many days it actually is
  // from today to the due date, not the offset the reminder was configured
  // for. Those two normally agree, but the cron runs once a day, so an
  // offset that fires a day (or more) later than its nominal target — a
  // catch-up after a missed run, or an offset held back by a more-recent
  // one on an invoice's first check — would otherwise say "due today" or
  // "1 day overdue" on a day when that's no longer true. `offsetDays` still
  // picks which template/tone to use (that's "which milestone this is"),
  // just not the number shown inside it.
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

  // `invoiceNum` is optional (not every invoice has a number set) — build
  // the reference without it rather than leaving a double space where it
  // would have gone.
  const invoiceRef = invoiceNum ? `invoice ${invoiceNum}` : "invoice";
  // Same reasoning as the body text above: "due soon" is only accurate when
  // there's actually still time left. A same-day or slightly-late "before"
  // send needs its own subject, not a blanket "due soon" regardless of
  // daysUntilDue.
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
