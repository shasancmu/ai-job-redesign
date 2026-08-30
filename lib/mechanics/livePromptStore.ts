import { createAdminClient } from "@/lib/supabase/admin";

// Authored LIVE templates (mode: Live). An instructor's own live prompt — a
// question the room answers, aggregating on screen — saved as a reusable module
// in the library. Runs on the existing word-cloud runtime.

export type LivePrompt = {
  slug: string;
  owner_id: string | null;
  org_id: string | null;
  name: string;
  emoji: string | null;
  prompt: string;
  subtitle: string | null;
  status: string;
};

function db() { return createAdminClient(); }

function slugify(name: string): string {
  const base = (name || "live-prompt").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "live-prompt";
  const suffix = Math.floor(Math.random() * 1e6).toString(36);
  return `${base}-${suffix}`;
}

// Everything an owner can see/edit (their own; a superadmin sees all elsewhere).
export async function listLivePrompts(ownerId?: string): Promise<LivePrompt[]> {
  try {
    let q = db().from("live_prompt_specs").select("*").order("updated_at", { ascending: false });
    if (ownerId) q = q.eq("owner_id", ownerId);
    const { data } = await q;
    return ((data as any[]) || []) as LivePrompt[];
  } catch { return []; }
}

// For the module catalog / library — {slug, name, emoji}, published only.
export async function listLivePromptCatalog(ownerId?: string): Promise<{ slug: string; name: string; emoji: string }[]> {
  try {
    let q = db().from("live_prompt_specs").select("slug, name, emoji").eq("status", "published");
    if (ownerId) q = q.eq("owner_id", ownerId);
    const { data } = await q;
    return ((data as any[]) || []).map((r) => ({ slug: String(r.slug), name: String(r.name || r.slug), emoji: r.emoji || "🌥️" }));
  } catch { return []; }
}

export async function getLivePrompt(slug: string): Promise<LivePrompt | null> {
  try {
    const { data } = await db().from("live_prompt_specs").select("*").eq("slug", slug).maybeSingle();
    return (data as any) || null;
  } catch { return null; }
}

export async function saveLivePrompt(opts: {
  slug?: string; ownerId: string; orgId?: string | null; name: string; emoji?: string; prompt: string; subtitle?: string;
}): Promise<{ ok: boolean; slug?: string; error?: string }> {
  const name = (opts.name || "").trim();
  const prompt = (opts.prompt || "").trim();
  if (!name) return { ok: false, error: "A name is required." };
  if (!prompt) return { ok: false, error: "A question is required." };
  const row: any = {
    name: name.slice(0, 160),
    emoji: (opts.emoji || "🌥️").slice(0, 8),
    prompt: prompt.slice(0, 1000),
    subtitle: opts.subtitle ? opts.subtitle.slice(0, 200) : null,
    org_id: opts.orgId || null,
    updated_at: new Date().toISOString(),
  };
  try {
    if (opts.slug) {
      // Update only your own.
      const { error } = await db().from("live_prompt_specs").update(row).eq("slug", opts.slug).eq("owner_id", opts.ownerId);
      if (error) return { ok: false, error: error.message };
      return { ok: true, slug: opts.slug };
    }
    const slug = slugify(name);
    const { error } = await db().from("live_prompt_specs").insert({ ...row, slug, owner_id: opts.ownerId, status: "published" });
    if (error) return { ok: false, error: error.message };
    return { ok: true, slug };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Could not save." };
  }
}

export async function deleteLivePrompt(slug: string, ownerId: string): Promise<void> {
  try { await db().from("live_prompt_specs").delete().eq("slug", slug).eq("owner_id", ownerId); } catch { /* ignore */ }
}
