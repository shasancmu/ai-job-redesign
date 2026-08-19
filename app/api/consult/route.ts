import { createClient } from "@/lib/supabase/server";
import { AI_ENABLED, VISION_ENABLED, businessInterviewReply, businessVoiceInterviewReply, businessReportAI, photoDescribeAI } from "@/lib/ai";
import { createAdminClient } from "@/lib/supabase/admin";
import { experimentNudge } from "@/lib/experiments";
import { wmsScore } from "@/lib/business";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// The 30-Minute Consult back end. Auth-gated (the owner). Three modes:
//  chat   — the qualitative interview
//  photo  — read one business photo into text (image never stored)
//  report — synthesize the full consult
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
    if (mode === "chat") {
      let nudge = "";
      try { nudge = await experimentNudge(createAdminClient(), String(body.sessionId || ""), "consult"); } catch {}
      const reply = body.voice
        ? await businessVoiceInterviewReply(body.messages || [], body.ctx || {}, nudge)
        : await businessInterviewReply(body.messages || [], body.ctx || {}, nudge);
      return Response.json({ reply });
    }

    if (mode === "photo") {
      if (!VISION_ENABLED) return Response.json({ error: "Photo analysis is not configured." }, { status: 503 });
      const image = String(body.image || "");
      if (!/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(image)) {
        return Response.json({ error: "Please attach a photo." }, { status: 400 });
      }
      if (image.length > 8_000_000) return Response.json({ error: "That photo is too large." }, { status: 413 });
      const d = await photoDescribeAI(image, `A small business: ${body.sells || ""}. Note what it reveals about the operation, products, space, or organization.`);
      return Response.json({ kind: d.kind, title: d.title, description: d.description, transcript: d.transcript });
    }

    if (mode === "report") {
      const wms = wmsScore(body.wms?.answers || {});
      const report = await businessReportAI({
        intake: body.intake || {},
        interview: body.interview || [],
        wms: { ...wms, answers: body.wms?.answers || {} },
        eighty: body.eighty || {},
        photos: body.photos || [],
      });
      if (!report) return Response.json({ error: "Couldn't build the report. Try again." }, { status: 502 });
      return Response.json({ report, wms });
    }

    return Response.json({ error: "unknown mode" }, { status: 400 });
  } catch (e: any) {
    return Response.json({ error: e?.message || "AI request failed." }, { status: 500 });
  }
}
