import { CheckCircle2, Circle, XCircle, Clock } from "lucide-react";
import { addDaysUtc } from "@/lib/reminders";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

function offsetLabel(offsetDays: number) {
  if (offsetDays === 0) return "On the due date";
  if (offsetDays < 0) return `${Math.abs(offsetDays)} day${offsetDays === -1 ? "" : "s"} before due`;
  return `${offsetDays} day${offsetDays === 1 ? "" : "s"} after due`;
}

export function ReminderTimeline({
  dueDate,
  offsets,
  logs,
  invoiceIsPaid,
  now,
}: {
  dueDate: string;
  offsets: number[];
  logs: { offset_days: number; status: "sent" | "failed"; sent_at: string }[];
  invoiceIsPaid: boolean;
  /** Current time, computed by the caller — keeps this component pure. */
  now: number;
}) {
  const logByOffset = new Map(logs.map((l) => [l.offset_days, l]));
  const sorted = [...offsets].sort((a, b) => a - b);

  if (sorted.length === 0) {
    return <p className="text-sm text-muted-foreground">No reminders configured.</p>;
  }

  return (
    <ol className="space-y-3">
      {sorted.map((offsetDays) => {
        const log = logByOffset.get(offsetDays);
        const targetDate = addDaysUtc(dueDate, offsetDays);
        const isPast = targetDate.getTime() < now;

        let icon = <Circle className="size-4 text-muted-foreground" />;
        let status = "Scheduled";
        let tone = "text-muted-foreground";

        if (log?.status === "sent") {
          icon = <CheckCircle2 className="size-4 text-emerald-600" />;
          status = `Sent ${formatDate(log.sent_at)}`;
          tone = "text-foreground";
        } else if (log?.status === "failed") {
          icon = <XCircle className="size-4 text-destructive" />;
          status = "Failed to send";
          tone = "text-destructive";
        } else if (invoiceIsPaid) {
          icon = <XCircle className="size-4 text-muted-foreground" />;
          status = "Skipped — invoice paid";
        } else if (isPast) {
          icon = <Clock className="size-4 text-muted-foreground" />;
          status = "Missed";
        }

        return (
          <li key={offsetDays} className="flex items-center gap-3 text-sm">
            {icon}
            <span className="flex-1 text-foreground">{offsetLabel(offsetDays)}</span>
            <span className="text-xs text-muted-foreground">{formatDate(targetDate)}</span>
            <span className={cn("w-32 shrink-0 text-right text-xs", tone)}>{status}</span>
          </li>
        );
      })}
    </ol>
  );
}
