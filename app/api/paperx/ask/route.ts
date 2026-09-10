import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, paperxAskReply } from "@/lib/ai";
import { streamingResponse } from "@/lib/stream";
import { loadPaperx } from "@/lib/paperx/store";
import type { PxGenome } from "@/lib/paperx/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// "Ask the paper": a grounded chat about one Paper Explainer. Streamed. The
// genome (and its stored source text) is loaded server-side so answers stay
// anchored to the actual paper.
export async function POST(request: Request) {
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const slug = String(body.slug || "").trim();
  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m: any) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string")
    .slice(-12)
    .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 1500) }));
  if (!slug || !messages.length) return Response.json({ error: "Ask a question." }, { status: 400 });

  const g = await loadPaperx(slug, user.id);
  if (!g) return Response.json({ error: "Explainer not found." }, { status: 404 });

  setFlow("paperx:ask");
  return streamingResponse((emit) => paperxAskReply(buildContext(g), messages, emit));
}

// The grounding context: the explainer's own distilled points, plus the paper's
// stored text when we have it (a much richer answer). Kept within a sane budget.
function buildContext(g: PxGenome): string {
  const parts = [
    `Paper: ${g.paperTitle}${g.authors ? ` — ${g.authors}` : ""}${g.venue ? ` (${g.venue})` : ""}`,
    `Big question: ${g.bigQuestion}`,
    `The conventional view (null): ${g.nullBelief.body}`,
    `The puzzle: we believe ${g.puzzle.believe}; we'd expect ${g.puzzle.expect}; but we observe ${g.puzzle.observe}.`,
    `Core idea: ${g.ideaStatement}`,
    `Evidence: ${g.evidence.headline}. ${g.evidence.takeaway}`,
    g.evidence.infographic?.stats?.length ? `Key numbers: ${g.evidence.infographic.stats.map((s) => `${s.value} (${s.label})`).join("; ")}` : "",
    `Mechanism: ${g.mechanism.body}`,
    `Implications: ${g.soWhat.body}`,
    g.glossary?.length ? `Terms: ${g.glossary.map((t) => `${t.term} = ${t.def}`).join("; ")}` : "",
  ].filter(Boolean);
  let ctx = parts.join("\n");
  if (g.sourceText) ctx += `\n\nFULL PAPER TEXT (the source of truth; quote and reason from it):\n${g.sourceText.slice(0, 14000)}`;
  return ctx;
}
