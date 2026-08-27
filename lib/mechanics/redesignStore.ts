// Store + schema for authored paired-redesign experiences. Two learners
// interview each other about a subject, then each redesigns the OTHER's subject
// on a shared instrument, then reveal + feedback. The authoring spec lives in
// redesign_specs; the runtime reuses the (already-realtime) sessions +
// workspaces tables, so no new realtime plumbing is added.
import { createAdminClient } from "@/lib/supabase/admin";

export const REDESIGN_PREFIX = "redesign:";

export type Bucket = { key: string; label: string; role: "ai" | "human"; hint: string };
export type RedesignSpec = {
  slug: string; name: string; emoji?: string;
  subject: string; // "job", "workflow", "research plan"
  setupPrompt: string; // what each learner writes about their OWN subject
  interviewPrompt: string; // what the interviewer should draw out about the partner
  splitTitle: string; // heading of the redesign instrument
  splitIntro: string; // the framework/instruction for the redesign
  buckets: Bucket[]; // the redesign instrument (AI vs human categories)
};

// Fixed, proven phase arc (mirrors the built-in paired redesign).
export const REDESIGN_PHASES = [
  { key: "setup", title: "Your subject today", mode: "solo", minutes: 3, subtitle: "Write your own in a line or two. This is what your partner will redesign, so make it real." },
  { key: "interviewA", title: "Interview · A asks", mode: "talk", interviewer: "A", minutes: 4, subtitle: "One partner interviews; the other shares. Take notes on what they do and what actually matters in it." },
  { key: "interviewB", title: "Interview · B asks", mode: "talk", interviewer: "B", minutes: 4, subtitle: "Switch. Now the other partner interviews." },
  { key: "redesign", title: "Redesign it", mode: "solo", minutes: 6, subtitle: "Using your notes, redesign your partner's subject on the instrument below." },
  { key: "reveal", title: "Share & get feedback", mode: "reveal", minutes: 6, subtitle: "Show your partner the redesign you made for them, and react to the one they made for you." },
  { key: "final", title: "The keepable version", mode: "solo", minutes: 4, subtitle: "Redo it with the feedback. This is the artifact your partner keeps." },
] as const;

export async function getRedesignSpec(slug: string): Promise<RedesignSpec | null> {
  try {
    const { data } = await createAdminClient()
      .from("redesign_specs").select("spec").eq("slug", String(slug || "").toLowerCase())
      .order("version", { ascending: false }).limit(1).maybeSingle();
    if (data?.spec) return data.spec as RedesignSpec;
  } catch { /* table missing */ }
  return null;
}

export type RedesignCatalogEntry = { slug: string; name: string; emoji: string };
export async function listRedesignCatalog(ownerId?: string): Promise<RedesignCatalogEntry[]> {
  try {
    const admin = createAdminClient();
    let q = admin.from("redesign_specs").select("slug, spec, owner_id").eq("status", "published").order("updated_at", { ascending: false });
    if (ownerId) q = q.eq("owner_id", ownerId);
    const { data } = await q;
    const seen = new Set<string>(); const out: RedesignCatalogEntry[] = [];
    for (const r of ((data as any[]) || [])) { if (seen.has(r.slug)) continue; seen.add(r.slug); out.push({ slug: r.slug, name: r.spec?.name || r.slug, emoji: r.spec?.emoji || "🤝" }); }
    return out;
  } catch { return []; }
}

export function validateRedesignSpec(s: any): string[] {
  const e: string[] = [];
  if (!s || typeof s !== "object") return ["Not a valid redesign."];
  if (!s.slug || !/^[a-z0-9-]+$/.test(s.slug)) e.push("Give it a lowercase-with-dashes slug.");
  if (!s.name || s.name.length < 3) e.push("Give it a name.");
  if (!s.subject) e.push("Say what gets redesigned (the subject).");
  if (!s.interviewPrompt || s.interviewPrompt.length < 10) e.push("Say what the interviewer should draw out.");
  if (!s.splitIntro || s.splitIntro.length < 10) e.push("Explain the redesign instrument (the framework).");
  const b = Array.isArray(s.buckets) ? s.buckets : [];
  if (b.length < 2) e.push("Add at least 2 redesign buckets.");
  b.forEach((x: any, i: number) => { if (!x.key || !x.label) e.push(`Bucket ${i + 1} needs a key and a label.`); if (x.role !== "ai" && x.role !== "human") e.push(`Bucket ${i + 1} role must be ai or human.`); });
  const keys = b.map((x: any) => x.key);
  if (new Set(keys).size !== keys.length) e.push("Bucket keys must be unique.");
  return e;
}
