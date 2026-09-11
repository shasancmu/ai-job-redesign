import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Text -> speech with OpenAI's voice model. The API key lives only on the server
// (OPEN_AI_API_KEY on Vercel). Returns MP3 audio bytes the browser plays back.
const KEY = process.env.OPEN_AI_API_KEY || process.env.OPENAI_API_KEY || "";
const MODEL = process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts";
const ALLOWED = new Set(["alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse", "nova", "onyx"]);

export async function POST(request: Request) {
  if (!KEY) return Response.json({ error: "OpenAI voice is not configured." }, { status: 503 });

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const input = String(body.text || "").trim().slice(0, 4000);
  const voice = ALLOWED.has(String(body.voice)) ? String(body.voice) : "sage";
  if (!input) return Response.json({ error: "no text" }, { status: 400 });

  try {
    const r = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, voice, input, response_format: "mp3" }),
    });
    if (!r.ok) {
      const detail = (await r.text().catch(() => "")).slice(0, 300);
      return Response.json({ error: "Speech generation failed.", detail }, { status: 502 });
    }
    const buf = await r.arrayBuffer();
    return new Response(buf, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Couldn't reach the voice service." }, { status: 502 });
  }
}
