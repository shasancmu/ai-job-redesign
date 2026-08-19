import { createClient } from "@/lib/supabase/server";
import { AI_ENABLED, VISION_ENABLED, boardRoundAI, boardVerdictAI, photoDescribeAI } from "@/lib/ai";
import { createAdminClient } from "@/lib/supabase/admin";
import { experimentNudge } from "@/lib/experiments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Your AI Board back end. Auth-gated.
// Modes: round (next debate round), verdict, ingest (turn a link/PDF/image into
// reference text the board can use).
export async function POST(request: Request) {
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  const mode = String(body.mode || "");

  try {
    if (mode === "ingest") return await ingest(body);

    const decision = String(body.decision || "");
    if (!decision.trim()) return Response.json({ error: "Describe the decision first." }, { status: 400 });
    const materials = sanitizeMaterials(body.materials);

    if (mode === "round") {
      let nudge = "";
      try { nudge = await experimentNudge(createAdminClient(), String(body.sessionId || ""), "board"); } catch {}
      const { round, replies } = await boardRoundAI({ decision, context: body.context, materials, transcript: body.transcript || [], nudge });
      if (!round.length) return Response.json({ error: "The board went quiet. Try again." }, { status: 502 });
      return Response.json({ round, replies });
    }
    if (mode === "verdict") {
      let nudge = "";
      try { nudge = await experimentNudge(createAdminClient(), String(body.sessionId || ""), "board", "report"); } catch {}
      const verdict = await boardVerdictAI({ decision, context: body.context, materials, transcript: body.transcript || [], nudge });
      if (!verdict) return Response.json({ error: "Couldn't reach a verdict. Try again." }, { status: 502 });
      return Response.json({ verdict });
    }
    return Response.json({ error: "unknown mode" }, { status: 400 });
  } catch (e: any) {
    return Response.json({ error: e?.message || "AI request failed." }, { status: 500 });
  }
}

function sanitizeMaterials(m: any): { label: string; text: string }[] {
  if (!Array.isArray(m)) return [];
  return m
    .filter((x) => x && x.text)
    .slice(0, 8)
    .map((x) => ({ label: String(x.label || "Material").slice(0, 120), text: String(x.text).slice(0, 12000) }));
}

async function ingest(body: any): Promise<Response> {
  const kind = String(body.kind || "");

  if (kind === "link") {
    const url = String(body.url || "").trim();
    if (!/^https?:\/\/[^\s]+$/i.test(url)) return Response.json({ error: "Enter a valid http(s) link." }, { status: 400 });
    try {
      const text = await fetchReadable(url);
      if (!text) return Response.json({ error: "Couldn't read anything at that link." }, { status: 422 });
      const label = hostOf(url);
      return Response.json({ label, text });
    } catch {
      return Response.json({ error: "Couldn't fetch that link." }, { status: 502 });
    }
  }

  if (kind === "pdf") {
    const data = String(body.data || ""); // base64, no data: prefix
    if (!data) return Response.json({ error: "No PDF data." }, { status: 400 });
    if (data.length > 9_000_000) return Response.json({ error: "That PDF is too large (try a smaller one or paste the text)." }, { status: 413 });
    try {
      const text = await pdfText(Buffer.from(data, "base64"));
      if (!text.trim()) return Response.json({ error: "Couldn't extract text (is it a scanned PDF? try a photo of the page)." }, { status: 422 });
      return Response.json({ label: String(body.filename || "PDF").slice(0, 120), text });
    } catch {
      return Response.json({ error: "Couldn't read that PDF. Paste the text instead." }, { status: 422 });
    }
  }

  if (kind === "image") {
    if (!VISION_ENABLED) return Response.json({ error: "Image reading is not configured." }, { status: 503 });
    const image = String(body.image || "");
    if (!/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(image)) return Response.json({ error: "Please attach an image." }, { status: 400 });
    if (image.length > 8_000_000) return Response.json({ error: "That image is too large." }, { status: 413 });
    const d = await photoDescribeAI(image, "A document, page, or screenshot the person shared as reference for a decision.");
    const text = (d.kind === "text" && d.transcript ? d.transcript : d.description) || "";
    return Response.json({ label: String(body.filename || d.title || "Image").slice(0, 120), text });
  }

  return Response.json({ error: "unknown ingest kind" }, { status: 400 });
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "link";
  }
}

async function fetchReadable(url: string): Promise<string> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 12000);
  try {
    const res = await fetch(url, { signal: ctl.signal, redirect: "follow", headers: { "User-Agent": "SuperadditiveBot/1.0 (+reference fetch)" } });
    const ct = res.headers.get("content-type") || "";
    let s = (await res.text()).slice(0, 500_000);
    if (ct.includes("html") || /<html/i.test(s)) {
      s = s
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"');
    }
    return s.replace(/\s+/g, " ").trim().slice(0, 14000);
  } finally {
    clearTimeout(t);
  }
}

async function pdfText(buf: Buffer): Promise<string> {
  const { PDFParse } = (await import("pdf-parse")) as any;
  const parser = new PDFParse({ data: new Uint8Array(buf) });
  const r = await parser.getText();
  return String(r?.text || "").replace(/[ \t]+/g, " ").slice(0, 14000);
}
