interface SupabaseEnv {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
}

function readSupabaseEnv(): SupabaseEnv {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  };
}

export function isSupabaseConfigured(): boolean {
  const env = readSupabaseEnv();
  return Boolean(env.url && env.anonKey);
}

export function getSupabaseEnv(options?: { requireServiceRole?: boolean }) {
  const env = readSupabaseEnv();

  if (!env.url || !env.anonKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  if (options?.requireServiceRole && !env.serviceRoleKey) {
    throw new Error(
      "Supabase service role is not configured. Set SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return env;
}
