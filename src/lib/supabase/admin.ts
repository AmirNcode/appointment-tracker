import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Secret-key Supabase client — BYPASSES Row-Level Security.
 *
 * `import "server-only"` makes the build fail if this module is ever pulled
 * into a Client Component, so the secret key can never reach the browser.
 * Use only in trusted server paths that never accept a client-supplied user_id
 * (e.g. the reminder cron in a later phase).
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
