import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export type AccountEmailKind =
  | "welcome"
  | "upgraded"
  | "canceled"
  | "claim_notice"
  | "recurring_notice"
  | "reminder_preview"
  | "digest";

/**
 * Best-effort quota bookkeeping for sends that reminder_logs doesn't cover.
 * Never throws — losing a tally row must not fail the send it describes.
 */
export async function logEmailSend(
  supabase: SupabaseClient<Database>,
  entry: { userId: string; kind: AccountEmailKind; recipientCount?: number }
) {
  const { error } = await supabase.from("email_log").insert({
    user_id: entry.userId,
    kind: entry.kind,
    recipient_count: entry.recipientCount ?? 1,
  });
  if (error) console.error("email-log: insert failed", { kind: entry.kind, error });
}
