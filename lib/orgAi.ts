// Resolve an org's BYO AI provider and install it for the current request, so
// that org's AI calls (student data included) route to its own models instead of
// the shared platform model. Server-only. The API key lives in org_ai_config and
// is never returned to any client — it is read here purely to make the call.
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveOrg } from "@/lib/orgs";
import { setAiProvider, type AiProvider } from "@/lib/aiProvider";

function admin() { try { return createAdminClient(); } catch { return null; } }

export type OrgAiStatus = {
  enabled: boolean;
  configured: boolean; // has base_url + model + a stored key
  base_url: string | null;
  model: string | null;
  low_model: string | null;
  has_key: boolean;
  updated_at: string | null;
};

// The provider to actually use, or null if the org hasn't set one up / disabled it.
export async function getOrgAiProvider(orgId: string): Promise<AiProvider | null> {
  const db = admin();
  if (!db || !orgId) return null;
  try {
    const { data } = await db.from("org_ai_config").select("enabled, base_url, api_key, model, low_model").eq("org_id", orgId).maybeSingle();
    const r = data as any;
    if (!r || !r.enabled || !r.base_url || !r.api_key || !r.model) return null;
    return { orgId, baseUrl: String(r.base_url), apiKey: String(r.api_key), model: String(r.model), lowModel: r.low_model ? String(r.low_model) : undefined };
  } catch { return null; }
}

// Status for the director UI — never includes the key itself.
export async function getOrgAiStatus(orgId: string): Promise<OrgAiStatus> {
  const empty: OrgAiStatus = { enabled: false, configured: false, base_url: null, model: null, low_model: null, has_key: false, updated_at: null };
  const db = admin();
  if (!db || !orgId) return empty;
  try {
    const { data } = await db.from("org_ai_config").select("enabled, base_url, model, low_model, api_key, updated_at").eq("org_id", orgId).maybeSingle();
    const r = data as any;
    if (!r) return empty;
    const has_key = !!r.api_key;
    return {
      enabled: !!r.enabled, base_url: r.base_url || null, model: r.model || null, low_model: r.low_model || null,
      has_key, configured: !!(r.base_url && r.model && has_key), updated_at: r.updated_at || null,
    };
  } catch { return empty; }
}

// Install the org's provider for the rest of this request (if any).
export async function useOrgAi(orgId: string | null | undefined): Promise<void> {
  if (!orgId) return;
  const p = await getOrgAiProvider(orgId);
  if (p) setAiProvider(p);
}

// Convenience: resolve the acting user's active org and install its provider.
// Call this after auth in any route that makes AI calls on behalf of an org member.
export async function useOrgAiForUser(user: { id: string; email?: string | null } | null): Promise<void> {
  if (!user) return;
  const org = await getActiveOrg(user).catch(() => null);
  if (org) await useOrgAi(org.id);
}
