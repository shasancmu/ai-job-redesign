import { PAYMENTS_ENABLED } from "@/lib/stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

// True if this user may use the app. When payments are disabled (no Stripe
// keys), everyone has access — the paywall stays dormant.
export async function hasAccess(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  if (!PAYMENTS_ENABLED) return true;
  const { data } = await supabase
    .from("entitlements")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}
