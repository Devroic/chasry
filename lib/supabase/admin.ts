import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Service-role Supabase client. Bypasses Row Level Security entirely.
 *
 * Allowed importers only: the cron jobs, the Stripe webhook, the /admin section (after
 * requireAdmin()), and the signed-link pages app/paid/[token] and app/email/mark-paid, whose
 * queries must stay scoped to the verified token's single invoice id. Never anywhere else.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
