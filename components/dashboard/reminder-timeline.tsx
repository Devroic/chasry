import { CheckCircle2, Circle, CircleMinus, XCircle } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { addDaysUtc } from "@/lib/reminders";
import { formatDate, todayInTimeZone } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SendReminderNowButton } from "@/components/dashboard/send-reminder-now-button";

function offsetLabel(t: Awaited<ReturnType<typeof getTranslations<"offsetPicker">>>, offsetDays: number) {
  if (offsetDays === 0) return t("onDueDateOption");
  if (offsetDays < 0) return t("daysBeforeDue", { days: Math.abs(offsetDays) });
  return t("daysAfterDue", { days: offsetDays });
}

export async function ReminderTimeline({
  invoiceId,
  dueDate,
  offsets,
  logs,
  invoiceIsPaid,
  sendPaused = false,
  timeZone = "UTC",
}: {
  invoiceId: string;
  dueDate: string;
  offsets: number[];
  logs: { offset_days: number; status: "sent" | "failed" | "skipped"; sent_at: string }[];
  invoiceIsPaid: boolean;
  /** Reminders paused (claim pending or snoozed) — hides manual Send now. */
  sendPaused?: boolean;
  /** Viewer's IANA timezone — "today" follows their clock, not UTC's. */
  timeZone?: string;
}) {
  const t = await getTranslations("offsetPicker");
  const tTimeline = await getTranslations("reminderTimeline");
  const locale = await getLocale();
  const logByOffset = new Map(logs.map((l) => [l.offset_days, l]));
  const sorted = [...offsets].sort((a, b) => a - b);

  if (sorted.length === 0) {
    return <p className="text-sm text-muted-foreground">{tTimeline("noneConfigured")}</p>;
  }

  // Viewer's calendar day, so a step never reads "Scheduled" past their midnight; the cron keeps UTC.
  const todayUtcMidnight = new Date(`${todayInTimeZone(timeZone)}T00:00:00Z`).getTime();

  return (
    <ol className="space-y-3">
      {sorted.map((offsetDays) => {
        const log = logByOffset.get(offsetDays);
        const targetDate = addDaysUtc(dueDate, offsetDays);
        const isPast = targetDate.getTime() < todayUtcMidnight;
        // Manual catch-up for an invoice created after today's cron run already happened.
        const canSendNow =
          !log && !invoiceIsPaid && !sendPaused && targetDate.getTime() === todayUtcMidnight;

        let icon = <Circle className="size-4 text-brand-secondary" />;
        let status = tTimeline("scheduled");
        let tone = "text-brand-secondary";

        if (log?.status === "sent") {
          icon = <CheckCircle2 className="size-4 text-emerald-600" />;
          status = tTimeline("sent", { date: formatDate(log.sent_at, locale) });
          tone = "text-emerald-600";
        } else if (log?.status === "failed") {
          icon = <XCircle className="size-4 text-destructive" />;
          status = tTimeline("failed");
          tone = "text-destructive";
        } else if (invoiceIsPaid) {
          icon = <CircleMinus className="size-4 text-emerald-600" />;
          status = tTimeline("skippedPaid");
          tone = "text-emerald-600";
        } else if (log?.status === "skipped" || isPast) {
          // Amber: routine (logged late or snoozed past); red stays reserved for real send failures.
          icon = <CircleMinus className="size-4 text-amber-600 dark:text-amber-400" />;
          status = tTimeline("skipped");
          tone = "text-amber-600 dark:text-amber-400";
        }

        return (
          <li key={offsetDays} className="text-sm">
            {/* One row is too cramped under ~375px, so below sm the date/status get their own. */}
            <div className="flex items-center gap-3">
              {icon}
              <span className="flex-1 text-foreground">{offsetLabel(t, offsetDays)}</span>
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {formatDate(targetDate, locale)}
              </span>
              <span className={cn("hidden text-xs sm:inline sm:w-32 sm:shrink-0 sm:text-right", tone)}>
                {status}
              </span>
            </div>
            <div className="mt-0.5 flex items-center justify-between pl-7 text-xs text-muted-foreground sm:hidden">
              <span>{formatDate(targetDate, locale)}</span>
              <span className={tone}>{status}</span>
            </div>
            {canSendNow && (
              <div className="mt-1 pl-7">
                <SendReminderNowButton invoiceId={invoiceId} offsetDays={offsetDays} />
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
