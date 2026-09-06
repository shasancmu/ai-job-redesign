// Program spotlights ("ads"): an org owner promotes a program or event with a
// module-shaped card that links to an internal landing page, and we track how it
// performs. Service-role only (RLS is on with no policies), so every read/write
// here goes through the admin client and callers gate by org ownership.
import { createAdminClient } from "@/lib/supabase/admin";

export type AdStatus = "draft" | "published";
export type AdEventKind = "impression" | "click" | "cta" | "interest";

export type OrgAd = {
  id: string;
  org_id: string;
  created_by: string | null;
  slug: string;
  emoji: string | null;
  title: string;
  tagline: string | null;
  body: string | null;
  image_url: string | null;
  cta_label: string | null;
  cta_url: string | null;
  status: AdStatus;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AdStats = { impressions: number; clicks: number; cta: number; interest: number; reach: number; ctr: number };

const CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";
export function slugify(s: string): string {
  const base = (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
  let suffix = "";
  for (let i = 0; i < 4; i++) suffix += CHARS[Math.floor(Math.random() * CHARS.length)];
  return `${base || "spotlight"}-${suffix}`;
}

// A spotlight is live if published and within any schedule window it declares.
export function isLive(ad: Pick<OrgAd, "status" | "starts_at" | "ends_at">): boolean {
  if (ad.status !== "published") return false;
  const now = Date.now();
  if (ad.starts_at && new Date(ad.starts_at).getTime() > now) return false;
  if (ad.ends_at && new Date(ad.ends_at).getTime() < now) return false;
  return true;
}

// Every spotlight an org owns, newest first (admin view).
export async function listOrgAds(orgId: string): Promise<OrgAd[]> {
  try {
    const { data } = await createAdminClient().from("org_ads").select("*").eq("org_id", orgId).order("updated_at", { ascending: false }).limit(200);
    return (data as OrgAd[]) || [];
  } catch { return []; }
}

// The live spotlights to show this org's members.
export async function activeAdsForOrg(orgId: string): Promise<OrgAd[]> {
  const all = await listOrgAds(orgId);
  return all.filter(isLive);
}

export async function getAdBySlug(slug: string): Promise<OrgAd | null> {
  try {
    const { data } = await createAdminClient().from("org_ads").select("*").eq("slug", slug).maybeSingle();
    return (data as OrgAd) || null;
  } catch { return null; }
}

export async function getAdById(id: string): Promise<OrgAd | null> {
  try {
    const { data } = await createAdminClient().from("org_ads").select("*").eq("id", id).maybeSingle();
    return (data as OrgAd) || null;
  } catch { return null; }
}

export type AdInput = Partial<Pick<OrgAd, "emoji" | "title" | "tagline" | "body" | "image_url" | "cta_label" | "cta_url" | "status" | "starts_at" | "ends_at">>;

// Create or update. Returns the row (with its slug). Caller must have verified
// the user owns orgId.
export async function saveAd(orgId: string, userId: string, input: AdInput & { id?: string }): Promise<OrgAd | null> {
  const db = createAdminClient();
  const patch: any = {
    emoji: input.emoji ?? null, title: (input.title || "").slice(0, 140), tagline: input.tagline ?? null,
    body: input.body ?? null, image_url: input.image_url ?? null,
    cta_label: input.cta_label ?? null, cta_url: input.cta_url ?? null,
    status: input.status === "published" ? "published" : "draft",
    starts_at: input.starts_at || null, ends_at: input.ends_at || null,
    updated_at: new Date().toISOString(),
  };
  if (input.id) {
    const { data } = await db.from("org_ads").update(patch).eq("id", input.id).eq("org_id", orgId).select("*").maybeSingle();
    return (data as OrgAd) || null;
  }
  const { data } = await db.from("org_ads").insert({ ...patch, org_id: orgId, created_by: userId, slug: slugify(patch.title) }).select("*").maybeSingle();
  return (data as OrgAd) || null;
}

// Best-effort interaction log — never throws into a viewer request.
export async function recordAdEvent(adId: string, kind: AdEventKind, ctx: { orgId?: string | null; userId?: string | null; anonId?: string | null; cohort?: string | null } = {}): Promise<void> {
  if (!adId || !["impression", "click", "cta", "interest"].includes(kind)) return;
  try {
    await createAdminClient().from("ad_events").insert({ ad_id: adId, org_id: ctx.orgId || null, user_id: ctx.userId || null, anon_id: ctx.anonId || null, cohort: ctx.cohort || null, kind });
  } catch { /* table missing / write failed → skip */ }
}

// Per-ad rollup for the whole org, in one read.
export async function adStatsByAd(orgId: string): Promise<Record<string, AdStats>> {
  const out: Record<string, AdStats> = {};
  try {
    const { data } = await createAdminClient().from("ad_events").select("ad_id, kind, user_id, anon_id").eq("org_id", orgId).limit(200000);
    const reach: Record<string, Set<string>> = {};
    for (const r of ((data as any[]) || [])) {
      const id = String(r.ad_id);
      const s = (out[id] ||= { impressions: 0, clicks: 0, cta: 0, interest: 0, reach: 0, ctr: 0 });
      if (r.kind === "impression") s.impressions++;
      else if (r.kind === "click") s.clicks++;
      else if (r.kind === "cta") s.cta++;
      else if (r.kind === "interest") s.interest++;
      (reach[id] ||= new Set()).add(String(r.user_id || r.anon_id || Math.random()));
    }
    for (const id of Object.keys(out)) {
      out[id].reach = reach[id]?.size || 0;
      out[id].ctr = out[id].impressions ? Math.round((out[id].clicks / out[id].impressions) * 100) : 0;
    }
  } catch { /* none */ }
  return out;
}

// The members who marked interest in a spotlight — names, since they're the
// org's own people (a soft lead list for the owner).
export async function interestedMembers(adId: string): Promise<{ name: string; at: string }[]> {
  try {
    const db = createAdminClient();
    const { data } = await db.from("ad_events").select("user_id, created_at").eq("ad_id", adId).eq("kind", "interest").order("created_at", { ascending: false }).limit(500);
    const rows = (data as any[]) || [];
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const r of rows) { const u = r.user_id; if (u && !seen.has(u)) { seen.add(u); ids.push(u); } }
    if (!ids.length) return [];
    const { data: profs } = await db.from("profiles").select("id, display_name, email").in("id", ids);
    const byId = new Map((profs as any[] || []).map((p) => [p.id, p.display_name || p.email || "A member"]));
    const firstAt = new Map<string, string>();
    for (const r of rows) if (r.user_id && !firstAt.has(r.user_id)) firstAt.set(r.user_id, r.created_at);
    return ids.map((id) => ({ name: byId.get(id) || "A member", at: firstAt.get(id) || "" }));
  } catch { return []; }
}
