import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Service-role Supabase client. Bypasses Row Level Security entirely.
 *
 * Only use this from trusted server contexts: the cron reminder job and the
 * Stripe webhook handler (neither has a user session to scope to), and the
 * /admin section (which does have a session, but its queries legitimately
 * need to span every user's data, not just the admin's own row) — and only
 * after requireAdmin() has verified the caller is an authorized admin.
 * Never import this into anything that runs in the browser, or into a
 * regular (non-admin) Server Component that renders user-supplied data.
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
