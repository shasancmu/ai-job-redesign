// Pulls a short, human headline + one-line summary out of whatever report a
// share token resolves to. Mirrors the data lookups in app/r/[token] but returns
// TEXT (for social/OG cards and <title>/description) instead of JSX. Best-effort:
// falls back to brand copy when a field is missing. Runs with the service-role
// client because share readers are unauthenticated (security rests on the
// unguessable token, exactly as the shared page itself does).
import { createAdminClient } from "@/lib/supabase/admin";

export type ReportPreview = { eyebrow: string; title: string; summary: string };

function firstString(...vals: any[]): string {
  for (const v of vals) if (typeof v === "string" && v.trim()) return v.trim();
  return "";
}

const FALLBACK_SUMMARY = "A result you can act on, made with Superadditive.";

export async function loadReportPreview(token: string): Promise<ReportPreview | null> {
  if (!token) return null;
  let admin;
  try { admin = createAdminClient(); } catch { return null; }
  try {
    // 1) Empathy aggregate: its own token on the owner's workspace canvas.
    const { data: ews } = await admin.from("workspaces").select("canvas").eq("canvas->>reportToken", token).limit(1).maybeSingle();
    const eCanvas = (ews?.canvas as any) || {};
    if (eCanvas.aggregate) {
      const a = eCanvas.aggregate;
      return { eyebrow: "Customer research", title: "What customers told us", summary: firstString(a.headline, a.summary, a.topNeed) || "An empathy synthesis from real customer interviews." };
    }

    // 2) Otherwise a session report by public_token (never an intake exercise).
    const { data: s } = await admin.from("sessions").select("id, exercise, host_id").eq("public_token", token).maybeSingle();
    if (!s) return null;
    const ex = s.exercise || "";
    if (ex === "empathy" || ex === "disclosure" || ex === "disclosure-haip") return null;

    if (ex === "workflow" || ex === "workflow-solo") {
      const { data: doc } = await admin.from("workflow_docs").select("analysis").eq("session_id", s.id).maybeSingle();
      const an = (doc?.analysis as any) || {};
      if (!an.summary && !(an.flow?.length)) return null;
      return { eyebrow: "Workflow redesign", title: "A redesigned workflow", summary: firstString(an.summary) || "Where AI and people each belong in the flow." };
    }

    const { data: ws } = await admin.from("workspaces").select("canvas, plan").eq("session_id", s.id).eq("author_id", s.host_id).maybeSingle();
    const canvas = (ws?.canvas as any) || {};
    const plan = (ws as any)?.plan;
    const r = canvas.report || {};
    const b = canvas.brief || {};
    // A generic best-available headline used for reports without a bespoke field.
    const generic = firstString(r.oneLiner, r.bottomLine, r.headline, r.summary, b.headline, b.summary, canvas.verdict?.headline, canvas.verdict?.recommendation);

    const M: Record<string, ReportPreview> = {
      vision: { eyebrow: "Company vision", title: canvas.intake?.name || "Our vision", summary: firstString(r.oneLiner, r.vividDescription) },
      "vision-voice": { eyebrow: "Company vision", title: canvas.intake?.name || "Our vision", summary: firstString(r.oneLiner, r.vividDescription) },
      consult: { eyebrow: "The 30-Minute Consult", title: canvas.intake?.name || "Business consult", summary: firstString(r.bottomLine, r.headline) },
      "voice-consult": { eyebrow: "The 30-Minute Consult", title: canvas.intake?.name || "Business consult", summary: firstString(r.bottomLine, r.headline) },
      superpower: { eyebrow: "Find Your Superpower", title: "A superpower profile", summary: generic },
      "personal-network": { eyebrow: "Personal network", title: "A personal network map", summary: generic },
      "domain-brief": { eyebrow: "Domain expertise", title: canvas.data?.domain ? String(canvas.data.domain) : "Domain expertise", summary: firstString(b.headline, b.summary) },
      collaborators: { eyebrow: "Find Collaborators", title: "Complementary collaborators", summary: generic },
      "licensing-brief": { eyebrow: "Licensing brief", title: canvas.title || "Licensing brief", summary: firstString(b.headline, b.summary) },
      resume: { eyebrow: "Résumé refresh", title: "Résumé changes", summary: generic },
      "resume-voice": { eyebrow: "Résumé refresh", title: "Résumé changes", summary: generic },
      "myopia-business": { eyebrow: "Blind spots", title: "Business blind spots", summary: generic },
      "myopia-career": { eyebrow: "Blind spots", title: "Career blind spots", summary: generic },
      board: { eyebrow: "Your AI Board", title: canvas.decision || "A decision", summary: firstString(canvas.verdict?.headline, canvas.verdict?.recommendation) },
      "career-xray": { eyebrow: "AI exposure", title: "A role x-ray", summary: generic },
      "jd-xray": { eyebrow: "AI exposure", title: "A role x-ray", summary: generic },
      "career-roadmap": { eyebrow: "Career roadmap", title: "A path for the next moves", summary: generic },
      solo: { eyebrow: "Job redesign", title: firstString(plan?.headline) || "A redesigned role", summary: firstString(plan?.summary) },
    };

    const hit = M[ex];
    if (hit) return { ...hit, summary: hit.summary || FALLBACK_SUMMARY };
    return { eyebrow: "Superadditive", title: "Your result", summary: generic || FALLBACK_SUMMARY };
  } catch {
    return null;
  }
}
