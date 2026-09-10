import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, paperExplainerAI } from "@/lib/ai";
import { extractPdfText } from "@/lib/mechanics/pdf";
import { sanitizePx, pxComplete } from "@/lib/paperx/sanitize";
import { enforceGenerateLimit, tooMany } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Turn an uploaded academic paper (PDF or pasted text) into an interactive
// explainer genome. The PDF and its extracted text are used in-memory only and
// never written anywhere; only the resulting spec is returned to the author.
export async function POST(request: Request) {
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  const rl = enforceGenerateLimit(user.id); if (!rl.ok) return tooMany(rl.retryAfter);

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }

  let text = String(body.text || "").trim();
  const b64 = String(body.pdf || "");
  if (!text && b64) {
    let buf: Buffer;
    try { buf = Buffer.from(b64, "base64"); } catch { return Response.json({ error: "bad file" }, { status: 400 }); }
    if (buf.length > 15 * 1024 * 1024) return Response.json({ error: "PDF is too large (max 15MB)." }, { status: 413 });
    try { text = (await extractPdfText(buf)).replace(/[ \t]+/g, " "); }
    catch { return Response.json({ error: "Couldn't read that PDF." }, { status: 422 }); }
    if (!text.trim()) return Response.json({ error: "No selectable text found (a scanned PDF?). Paste the text instead." }, { status: 422 });
  }
  if (text.length < 400) return Response.json({ error: "That's too short to build an explainer from. Upload the paper's PDF, or paste more of it." }, { status: 400 });

  setFlow("paperx-generate");
  try {
    const raw = await paperExplainerAI({ paperText: text });
    const genome = sanitizePx(raw, "Paper Explainer");
    if (!pxComplete(genome)) {
      return Response.json({ error: "The draft came back incomplete. Try again, or paste a cleaner copy of the paper." }, { status: 502 });
    }
    // Keep the paper's text on the genome so the "Ask the paper" chat is grounded
    // in the real source (stored in the module spec, never shown to the reader).
    genome.sourceText = text.slice(0, 16000);
    return Response.json({ genome });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Failed to generate." }, { status: 500 });
  }
}
