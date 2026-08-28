import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, moduleCopilotAI, summarizeSourceAI } from "@/lib/ai";
import { extractDocxText } from "@/lib/mechanics/docx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Upload teaching materials -> extract text -> pick the best module TYPE and a
// concrete concept. Generation is then done by the existing per-type copilot on
// the client (no duplication). This is the router half of the "upload and go".
const ROUTER = `You help a busy professor turn their teaching materials into an interactive learning module. You are given the text of their slides / readings / notes. Propose a MENU of 3 to 4 genuinely different modules these materials could become, so the professor can choose. Prefer spread across DIFFERENT types where the materials support it (do not return four role-plays). Best fit first.

The module types:
- roleplay: the learner interrogates an AI character who won't lie but will spin, under a hidden truth, and must judge under uncertainty. Best for: detecting deception/wrongdoing, eliciting from a guarded source, diagnosis, diligence, investigation, reading a person. (The Earnings Call is this.)
- interview: an AI interviews the learner about a subject, then drafts a structured framework canvas / scorecard / verdict. Best for: applying a FRAMEWORK to the learner's own situation (Five Forces, Jobs-to-be-Done, a scorecard, a strategy canvas, a reflection).
- negotiation: the learner negotiates a scored deal against an AI counterpart with a hidden payoff table. Best for: negotiation, bargaining, deal-making, trade-offs.
- benchmark: a timed multiple-choice "you vs. AI" test. Best for: testing recall/reasoning on factual or conceptual material.
- analytical: the learner pastes a subject; the AI decomposes it into units and scores each against a scale the author defines. Best for: X-ray / audit style analysis (AI-exposure of a job, risk of a plan, evidence strength of an argument).
- redesign: two learners interview each other, then redesign each other's work on an AI/Human instrument (a live paired session). Best for: workshop-style peer redesign of a job or workflow.
- explainer: a taught, guided walkthrough that explains a topic section by section (exposition, not interactive). Best for: teaching a concept, framework, or process clearly before the interactive work.

Output ONLY JSON: {"options":[{"kind":"<one type key>","title":"a short module name","concept":"a specific one-paragraph brief for that type's copilot, naming the situation, the characters/subject, and what the learner should walk away able to do, grounded in the materials","rationale":"one sentence on why this fits these materials"}]}. Give 3 to 4 options, best first. No em dashes.`;

export async function POST(request: Request) {
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const files = Array.isArray(body.files) ? body.files.slice(0, 12) : [];
  if (!files.length) return Response.json({ error: "Add at least one file." }, { status: 400 });
  setFlow("mechanics:autobuild");

  // Extract text from each file by type.
  const parts: string[] = [];
  for (const f of files) {
    const name = String(f.name || "file");
    const ext = name.toLowerCase().split(".").pop() || "";
    try {
      const buf = Buffer.from(String(f.b64 || ""), "base64");
      if (buf.length > 20 * 1024 * 1024) continue;
      let text = "";
      if (ext === "pdf") { const { PDFParse } = (await import("pdf-parse")) as any; text = String((await new PDFParse({ data: new Uint8Array(buf) }).getText())?.text || ""); }
      else if (ext === "docx") text = extractDocxText(buf);
      else if (ext === "txt" || ext === "md" || ext === "markdown") text = buf.toString("utf8");
      text = text.replace(/[ \t]+/g, " ").trim();
      if (text) parts.push(`# ${name}\n${text.slice(0, 20000)}`);
    } catch { /* skip a file we can't read */ }
  }
  if (!parts.join("").trim()) return Response.json({ error: "Couldn't read text from those files. Scanned PDFs and images aren't supported; try a text-based PDF, a .docx, or a .txt." }, { status: 422 });

  let source = parts.join("\n\n---\n\n");
  if (source.length > 14000) { try { source = await summarizeSourceAI(source); } catch { source = source.slice(0, 14000); } }

  try {
    const routed = await moduleCopilotAI(ROUTER, source);
    if (!routed?.kind) return Response.json({ error: "Couldn't read the materials into a module. Try adding a note about what you want." }, { status: 502 });
    return Response.json({ kind: routed.kind, concept: routed.concept || "", title: routed.title || "", rationale: routed.rationale || "", alternate: routed.alternate || "", source });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Something went wrong." }, { status: 500 });
  }
}
