import { STATUS_TONES } from "@/components/status-tones";

/**
 * Pill styling for a subscriber's plan status. Statuses with no entry render the Badge's default
 * outline look.
 */
export const PLAN_STATUS_STYLE: Record<string, string> = {
  active: STATUS_TONES.positive,
  past_due: STATUS_TONES.negative,
};

/** subscription_status → label map. `t` is a translator scoped to "admin.status". */
export function planStatusLabels(t: (key: "pro" | "pastDue" | "canceled" | "free") => string) {
  return {
    active: t("pro"),
    past_due: t("pastDue"),
    canceled: t("canceled"),
    none: t("free"),
  } as Record<string, string>;
}
