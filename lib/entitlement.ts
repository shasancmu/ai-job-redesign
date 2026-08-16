import { PAYMENTS_ENABLED } from "@/lib/stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

// The set of things a user is entitled to: module slugs and/or "all".
export async function getEntitlements(
  supabase: SupabaseClient,
  userId: string
): Promise<Set<string>> {
  const { data } = await supabase
    .from("entitlements")
    .select("module")
    .eq("user_id", userId);
  return new Set((data || []).map((r: any) => r.module));
}

// Does this user have access to a specific module? When payments are disabled
// (no Stripe keys), everyone has access — the paywall stays dormant.
export async function hasModuleAccess(
  supabase: SupabaseClient,
  userId: string,
  moduleSlug: string,
  isInstructor = false
): Promise<boolean> {
  if (!PAYMENTS_ENABLED) return true;
  if (isInstructor) return true;
  const ents = await getEntitlements(supabase, userId);
  return ents.has("all") || ents.has(moduleSlug);
}

// Legacy helper (whole-app gate) — kept for any caller that still needs it.
export async function hasAccess(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  if (!PAYMENTS_ENABLED) return true;
  const ents = await getEntitlements(supabase, userId);
  return ents.size > 0;
}
