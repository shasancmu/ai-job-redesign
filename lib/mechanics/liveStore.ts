// Store + schema for authored live activities. A LiveSpec is authored once; a
// facilitator runs it (a live_sessions row); anonymous participants submit into
// live_entries via a no-auth service-role API. Mirrors the cloud triad.
import { createAdminClient } from "@/lib/supabase/admin";

export type LiveKind = "wordcloud" | "poll" | "responses";
export type LiveSpec = {
  slug: string; name: string; emoji?: string;
  kind: LiveKind;
  prompt: string; // the question shown to the room
  options?: string[]; // poll only
  synthesize?: boolean; // responses/wordcloud: offer an AI synthesis
  synthesizePrompt?: string; // how the AI should read the room
};

export async function getLiveSpec(slug: string): Promise<LiveSpec | null> {
  try {
    const { data } = await createAdminClient()
      .from("live_specs").select("spec").eq("slug", String(slug || "").toLowerCase())
      .order("version", { ascending: false }).limit(1).maybeSingle();
    if (data?.spec) return data.spec as LiveSpec;
  } catch { /* table missing */ }
  return null;
}

// Resolve a run by code → its spec (for the public participant page + presenter).
export async function getLiveSession(code: string): Promise<{ session: any; spec: LiveSpec } | null> {
  try {
    const admin = createAdminClient();
    const { data: session } = await admin.from("live_sessions").select("*").eq("code", String(code || "").toUpperCase()).maybeSingle();
    if (!session) return null;
    const spec = await getLiveSpec(session.slug);
    if (!spec) return null;
    return { session, spec };
  } catch { return null; }
}

export type LiveCatalogEntry = { slug: string; name: string; emoji: string; kind: LiveKind };
export async function listLiveCatalog(ownerId?: string): Promise<LiveCatalogEntry[]> {
  try {
    const admin = createAdminClient();
    let q = admin.from("live_specs").select("slug, spec, owner_id").eq("status", "published").order("updated_at", { ascending: false });
    if (ownerId) q = q.eq("owner_id", ownerId);
    const { data } = await q;
    const seen = new Set<string>(); const out: LiveCatalogEntry[] = [];
    for (const r of ((data as any[]) || [])) { if (seen.has(r.slug)) continue; seen.add(r.slug); out.push({ slug: r.slug, name: r.spec?.name || r.slug, emoji: r.spec?.emoji || "🌥️", kind: r.spec?.kind || "wordcloud" }); }
    return out;
  } catch { return []; }
}

// Client-safe view for the public participant page (just the prompt + options).
export function publicLiveSpec(s: LiveSpec): any {
  return { slug: s.slug, name: s.name, emoji: s.emoji, kind: s.kind, prompt: s.prompt, options: s.kind === "poll" ? (s.options || []) : undefined };
}

export function validateLiveSpec(s: any): string[] {
  const e: string[] = [];
  if (!s || typeof s !== "object") return ["Not a valid live activity."];
  if (!s.slug || !/^[a-z0-9-]+$/.test(s.slug)) e.push("Give it a lowercase-with-dashes slug.");
  if (!s.name || s.name.length < 3) e.push("Give it a name.");
  if (!["wordcloud", "poll", "responses"].includes(s.kind)) e.push('kind must be wordcloud, poll, or responses.');
  if (!s.prompt || s.prompt.length < 3) e.push("Write the prompt the room sees.");
  if (s.kind === "poll") { const o = Array.isArray(s.options) ? s.options.filter((x: any) => x && x.trim()) : []; if (o.length < 2) e.push("A poll needs at least 2 options."); }
  return e;
}
