import { CheckCircle2, Circle, CircleMinus, XCircle } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { addDaysUtc } from "@/lib/reminders";
import { formatDate } from "@/lib/format";
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
  now,
}: {
  invoiceId: string;
  dueDate: string;
  offsets: number[];
  logs: { offset_days: number; status: "sent" | "failed" | "skipped"; sent_at: string }[];
  invoiceIsPaid: boolean;
  /** Current time, computed by the caller — keeps this component pure. */
  now: number;
}) {
  const t = await getTranslations("offsetPicker");
  const tTimeline = await getTranslations("reminderTimeline");
  const locale = await getLocale();
  const logByOffset = new Map(logs.map((l) => [l.offset_days, l]));
  const sorted = [...offsets].sort((a, b) => a - b);

  if (sorted.length === 0) {
    return <p className="text-sm text-muted-foreground">{tTimeline("noneConfigured")}</p>;
  }

  // Compared by calendar day, not exact timestamp — an offset due "today"
  // stays Scheduled all day, not Skipped the moment any time has passed
  // since UTC midnight. Matches send-reminders' cron exactly: each offset
  // gets one chance, its own target day. If that day passes without a log,
  // the cron will mark it skipped on its next run, no later catch-up, so
  // that outcome is already certain and shown immediately rather than as a
  // transient "sending soon" that could go either way.
  const nowDate = new Date(now);
  const todayUtcMidnight = Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), nowDate.getUTCDate());

  return (
    <ol className="space-y-3">
      {sorted.map((offsetDays) => {
        const log = logByOffset.get(offsetDays);
        const targetDate = addDaysUtc(dueDate, offsetDays);
        const isPast = targetDate.getTime() < todayUtcMidnight;
        // The one gap the "exact day only" cron rule leaves: an invoice
        // created after today's single daily run already happened. This
        // is the manual catch-up for exactly that case, so it only shows
        // for a row that's due today, unpaid, and genuinely never attempted.
        const canSendNow = !log && !invoiceIsPaid && targetDate.getTime() === todayUtcMidnight;

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
          icon = <XCircle className="size-4 text-destructive" />;
          status = tTimeline("skipped");
          tone = "text-destructive";
        }

        return (
          <li key={offsetDays} className="text-sm">
            {/* A single flex row (icon, label, date, fixed-width status) is
                too cramped under ~375px — the label wraps and the row
                grows tall unevenly. Below sm, the date/status move to their
                own second line instead of squeezing into the same row. */}
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
