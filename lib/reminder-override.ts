/**
 * A per-client/per-invoice reminder-schedule override is either "off"
 * (`reminder_offsets`/`reminder_enabled` both `null` — inherit) or "on"
 * (both set, even if `offsets` is an empty array, which is a valid — if
 * unusual — "no reminders for this one" state). That empty-array case is
 * exactly why this isn't just routed through the generic `toFormData()`
 * helper: `String([])` and `String(null)` both come out `""`, which would
 * make "override on with nothing selected" indistinguishable from "no
 * override" on the way through FormData. An explicit `reminder_active`
 * flag plus a JSON-encoded offsets array sidesteps that ambiguity.
 */

export function encodeReminderOverride(
  formData: FormData,
  active: boolean,
  enabled: boolean,
  offsets: number[]
) {
  formData.set("reminder_active", active ? "true" : "false");
  if (active) {
    formData.set("reminder_enabled", enabled ? "true" : "false");
    formData.set("reminder_offsets", JSON.stringify(offsets));
  }
}

export function decodeReminderOverride(formData: FormData): {
  reminder_offsets: number[] | null;
  reminder_enabled: boolean | null;
} {
  if (formData.get("reminder_active") !== "true") {
    return { reminder_offsets: null, reminder_enabled: null };
  }

  const enabled = formData.get("reminder_enabled") === "true";
  const raw = formData.get("reminder_offsets");
  let offsets: number[] = [];
  if (typeof raw === "string" && raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        offsets = parsed.filter((n): n is number => typeof n === "number" && Number.isInteger(n));
      }
    } catch {
      // Malformed payload — treat as no offsets rather than failing the whole save.
    }
  }
  return { reminder_offsets: offsets, reminder_enabled: enabled };
}
