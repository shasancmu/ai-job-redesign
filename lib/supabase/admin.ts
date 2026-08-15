import { createClient } from "@supabase/supabase-js";

// Server-only client that uses the SERVICE ROLE key and bypasses RLS.
// Only ever import this from server code (webhook / verified server actions) —
// never from a client component.
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
