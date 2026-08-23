import { CheckCircle2, Circle, XCircle, Clock } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { addDaysUtc } from "@/lib/reminders";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

function offsetLabel(t: Awaited<ReturnType<typeof getTranslations<"offsetPicker">>>, offsetDays: number) {
  if (offsetDays === 0) return t("onDueDateOption");
  if (offsetDays < 0) return t("daysBeforeDue", { days: Math.abs(offsetDays) });
  return t("daysAfterDue", { days: offsetDays });
}

export async function ReminderTimeline({
  dueDate,
  offsets,
  logs,
  invoiceIsPaid,
  now,
}: {
  dueDate: string;
  offsets: number[];
  logs: { offset_days: number; status: "sent" | "failed" | "skipped"; sent_at: string }[];
  invoiceIsPaid: boolean;
  /** Current time, computed by the caller — keeps this component pure. */
  now: number;
}) {
  const t = await getTranslations("offsetPicker");
  const tTimeline = await getTranslations("reminderTimeline");
  const logByOffset = new Map(logs.map((l) => [l.offset_days, l]));
  const sorted = [...offsets].sort((a, b) => a - b);

  if (sorted.length === 0) {
    return <p className="text-sm text-muted-foreground">{tTimeline("noneConfigured")}</p>;
  }

  return (
    <ol className="space-y-3">
      {sorted.map((offsetDays) => {
        const log = logByOffset.get(offsetDays);
        const targetDate = addDaysUtc(dueDate, offsetDays);
        const isPast = targetDate.getTime() < now;

        let icon = <Circle className="size-4 text-muted-foreground" />;
        let status = tTimeline("scheduled");
        let tone = "text-muted-foreground";

        if (log?.status === "sent") {
          icon = <CheckCircle2 className="size-4 text-emerald-600" />;
          status = tTimeline("sent", { date: formatDate(log.sent_at) });
          tone = "text-foreground";
        } else if (log?.status === "failed") {
          icon = <XCircle className="size-4 text-destructive" />;
          status = tTimeline("failed");
          tone = "text-destructive";
        } else if (log?.status === "skipped") {
          icon = <XCircle className="size-4 text-muted-foreground" />;
          status = tTimeline("skippedLaterSent");
        } else if (invoiceIsPaid) {
          icon = <XCircle className="size-4 text-muted-foreground" />;
          status = tTimeline("skippedPaid");
        } else if (isPast) {
          icon = <Clock className="size-4 text-muted-foreground" />;
          status = tTimeline("missed");
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
                {formatDate(targetDate)}
              </span>
              <span className={cn("hidden text-xs sm:inline sm:w-32 sm:shrink-0 sm:text-right", tone)}>
                {status}
              </span>
            </div>
            <div className="mt-0.5 flex items-center justify-between pl-7 text-xs text-muted-foreground sm:hidden">
              <span>{formatDate(targetDate)}</span>
              <span className={tone}>{status}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
