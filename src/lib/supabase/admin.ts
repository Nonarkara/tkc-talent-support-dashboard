import { createClient } from "@supabase/supabase-js";

import { getSupabaseEnv } from "./env";

// Service role client for API routes — bypasses RLS
export function createAdminClient() {
  const env = getSupabaseEnv({ requireServiceRole: true });

  return createClient(
    env.url,
    env.serviceRoleKey,
  );
}
