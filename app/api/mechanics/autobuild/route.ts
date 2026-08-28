import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, moduleCopilotAI, summarizeSourceAI } from "@/lib/ai";
import { extractDocxText } from "@/lib/mechanics/docx";
import { extractPdfText } from "@/lib/mechanics/pdf";

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
- benchmark: a timed multiple-choice quiz, scored server-side. Best for: testing recall or understanding of factual or conceptual material.
- analytical: the learner pastes a subject; the AI decomposes it into units and scores each against a scale the author defines. Best for: X-ray / audit style analysis (AI-exposure of a job, risk of a plan, evidence strength of an argument).
- redesign: two learners interview each other, then redesign each other's work on an AI/Human instrument (a live paired session). Best for: workshop-style peer redesign of a job or workflow.
- explainer: a taught, guided walkthrough that explains a topic section by section (exposition, not interactive). Best for: teaching a concept, framework, or process clearly before the interactive work.
- newsframe: the learner applies a business framework to a real, current news story pulled live at runtime, then makes a calibrated call and is graded on the application. Best for: keeping a framework alive against this week's headlines (Five Forces on the AI industry, disruption watch, moat check).

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

  // Extract text from each file by type. Track why a file yielded nothing so the
  // error we return is honest (a real extraction failure is not a scanned PDF).
  const parts: string[] = [];
  let threw = false; // extraction errored on at least one file
  let emptyText = false; // extraction ran but found no text (likely scanned/empty)
  for (const f of files) {
    const name = String(f.name || "file");
    const ext = name.toLowerCase().split(".").pop() || "";
    try {
      let text = "";
      // PDFs are extracted in the browser (see lib/pdfClient) and arrive as text,
      // which sidesteps every serverless-runtime pitfall. Fall back to server-side
      // extraction only if the client couldn't send text.
      if (typeof f.text === "string" && f.text.trim()) {
        text = f.text;
      } else {
        const buf = Buffer.from(String(f.b64 || ""), "base64");
        if (buf.length > 20 * 1024 * 1024) continue;
        if (ext === "pdf") { text = await extractPdfText(buf); }
        else if (ext === "docx") text = extractDocxText(buf);
        else if (ext === "txt" || ext === "md" || ext === "markdown") text = buf.toString("utf8");
      }
      text = text.replace(/[ \t]+/g, " ").trim();
      if (text) parts.push(`# ${name}\n${text.slice(0, 20000)}`);
      else emptyText = true;
    } catch (err) {
      threw = true;
      console.error(`[autobuild] extraction failed for ${name}:`, err);
    }
  }
  if (!parts.join("").trim()) {
    const msg = threw
      ? "We hit an error reading those files. Please try again, or paste the text into the description instead."
      : "Couldn't find any text in those files. Scanned PDFs and images aren't supported; try a text-based PDF, a .docx, or a .txt.";
    return Response.json({ error: msg, reason: threw ? "extract_error" : "empty" }, { status: 422 });
  }
  void emptyText;

  let source = parts.join("\n\n---\n\n");
  if (source.length > 14000) { try { source = await summarizeSourceAI(source); } catch { source = source.slice(0, 14000); } }

  try {
    const routed = await moduleCopilotAI(ROUTER, source);
    // The router returns a MENU: { options: [{ kind, title, concept, rationale }] }.
    const options = Array.isArray(routed?.options)
      ? routed.options.filter((o: any) => o && typeof o.kind === "string" && o.kind.trim())
      : [];
    if (!options.length) {
      console.error("[autobuild] router returned no usable options:", JSON.stringify(routed)?.slice(0, 500));
      return Response.json({ error: "Couldn't turn those materials into module ideas. Try adding a short note about what you want to build." }, { status: 502 });
    }
    return Response.json({ options, source });
  } catch (e: any) {
    console.error("[autobuild] router failed:", e);
    return Response.json({ error: e?.message || "Something went wrong." }, { status: 500 });
  }
}
