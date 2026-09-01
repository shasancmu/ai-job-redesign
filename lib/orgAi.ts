// Resolve an org's BYO AI provider and install it for the current request, so
// that org's AI calls (student data included) route to its own models instead of
// the shared platform model. Server-only. The API key lives in org_ai_config and
// is never returned to any client — it is read here purely to make the call.
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
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

// Called LAZILY by the AI layer on the first non-vision AI call of a request:
// resolve the acting user's active org and install its provider (or mark that we
// tried and found none, so the request falls back to the system/env models).
// This gives every AI route coverage automatically, with no per-route wiring.
// Safe outside a request (cron, scripts): cookies()/getUser throw, we catch, and
// the system models are used. `provider` is set (possibly null) either way, which
// also marks resolution attempted so this runs at most once per request.
export async function resolveRequestAiProvider(): Promise<void> {
  let provider: AiProvider | null = null;
  try {
    // Cheap gate: if NO org has BYO enabled (the common case), skip the whole
    // resolution — no getUser, no per-request cost. Cached per instance for 60s.
    if (await anyOrgHasByo()) {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const org = await getActiveOrg(user).catch(() => null);
        if (org) provider = await getOrgAiProvider(org.id);
      }
    }
  } catch { /* no request context / no session → system models */ }
  setAiProvider(provider);
}

// Is any org currently using BYO models? Cached per server instance so the lazy
// resolver stays free until someone actually turns it on.
let _byoCache: { at: number; any: boolean } | null = null;
async function anyOrgHasByo(): Promise<boolean> {
  const now = Date.now();
  if (_byoCache && now - _byoCache.at < 60_000) return _byoCache.any;
  let any = false;
  try {
    const db = admin();
    if (db) {
      const { count } = await db.from("org_ai_config").select("org_id", { count: "exact", head: true }).eq("enabled", true);
      any = (count || 0) > 0;
    }
  } catch { /* on error assume none, so we never add cost on a broken query */ }
  _byoCache = { at: now, any };
  return any;
}
