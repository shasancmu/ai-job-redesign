import { createAdminClient } from "@/lib/supabase/admin";
import { LIVING_CASE_TYPE } from "@/lib/cases/store";

// The teaching-intelligence layer: learn an instructor's voice and framing from
// the cases they've already authored, so each new case sounds more like them.
// This compounds — the more they author here, the better generation fits them,
// and that fit can't be recreated on a fresh tool. Returns "" for a first-timer.
export async function authorStyleContext(userId: string | null | undefined): Promise<string> {
  if (!userId) return "";
  let admin;
  try { admin = createAdminClient(); } catch { return ""; }
  const { data } = await admin
    .from("custom_modules")
    .select("spec, updated_at")
    .eq("author_id", userId)
    .eq("super_type", LIVING_CASE_TYPE)
    .order("updated_at", { ascending: false })
    .limit(4);
  const cases = ((data || []) as any[]).map((r) => r.spec).filter(Boolean);
  if (cases.length < 2) return ""; // need a couple of examples before a style emerges

  const lines = cases.slice(0, 4).map((g: any) => {
    const eyebrow = String(g.eyebrow || "").trim();
    const decision = String(g.decision || "").trim();
    const lens = String(g.teachingIntro || "").replace(/\*\*?/g, "").trim().slice(0, 160);
    return `- "${String(g.title || "").slice(0, 90)}" — framing: ${eyebrow}; decision put as: "${decision}"${lens ? `; teaching lens: ${lens}` : ""}`;
  });
  return `\n\nTHE AUTHOR'S HOUSE STYLE — this instructor has authored these cases before. Match their voice, their level of provocation in titles, how they frame the decision, and their pedagogical lens. Do NOT reuse their content; just fit their style:\n${lines.join("\n")}`;
}
