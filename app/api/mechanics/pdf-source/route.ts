import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, summarizeSourceAI } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Turn an uploaded PDF into a short grounding summary for the Copilot. The file
// and its extracted text are used in-memory only and never written anywhere;
// just the fast-model summary is returned.
export async function POST(request: Request) {
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const b64 = String(body.pdf || "");
  if (!b64) return Response.json({ error: "No file." }, { status: 400 });

  let buf: Buffer;
  try { buf = Buffer.from(b64, "base64"); } catch { return Response.json({ error: "bad file" }, { status: 400 }); }
  if (buf.length > 15 * 1024 * 1024) return Response.json({ error: "PDF is too large (max 15MB)." }, { status: 413 });

  setFlow("mechanics:pdf-source");
  let text = "";
  try {
    text = await pdfText(buf);
  } catch {
    return Response.json({ error: "Couldn't read that PDF." }, { status: 422 });
  }
  if (!text.trim()) return Response.json({ error: "No selectable text found (a scanned PDF? paste the text instead)." }, { status: 422 });

  try {
    const summary = await summarizeSourceAI(text);
    if (!summary) return Response.json({ error: "Couldn't summarize the PDF. Try again." }, { status: 502 });
    return Response.json({ summary });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Summary failed." }, { status: 500 });
  }
}

async function pdfText(buf: Buffer): Promise<string> {
  const { PDFParse } = (await import("pdf-parse")) as any;
  const parser = new PDFParse({ data: new Uint8Array(buf) });
  const r = await parser.getText();
  return String(r?.text || "").replace(/[ \t]+/g, " ").slice(0, 14000);
}
