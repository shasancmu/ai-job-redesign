import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Speech -> text with OpenAI's transcription model. The browser records a turn of
// audio and posts it here as form-data; we forward it to OpenAI with the server-held
// key (OPEN_AI_API_KEY) and return the transcript. Nothing is stored.
const KEY = process.env.OPEN_AI_API_KEY || process.env.OPENAI_API_KEY || "";
const MODEL = process.env.OPENAI_STT_MODEL || "gpt-4o-transcribe";

export async function POST(request: Request) {
  if (!KEY) return Response.json({ error: "OpenAI voice is not configured." }, { status: 503 });

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let file: unknown;
  let language = "";
  try {
    const form = await request.formData();
    file = form.get("audio");
    language = String(form.get("language") || "");
  } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  if (!(file instanceof Blob) || file.size === 0) return Response.json({ text: "" });
  // Guard against absurd uploads (a turn is short); ~25MB is OpenAI's own cap.
  if (file.size > 25 * 1024 * 1024) return Response.json({ error: "audio too large" }, { status: 413 });

  try {
    const fd = new FormData();
    fd.append("file", file, "turn.webm");
    fd.append("model", MODEL);
    if (language) fd.append("language", language);
    const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}` },
      body: fd,
    });
    if (!r.ok) {
      const detail = (await r.text().catch(() => "")).slice(0, 300);
      return Response.json({ error: "Transcription failed.", detail }, { status: 502 });
    }
    const j = await r.json().catch(() => ({}));
    return Response.json({ text: String(j?.text || "").trim() });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Couldn't reach the voice service." }, { status: 502 });
  }
}
