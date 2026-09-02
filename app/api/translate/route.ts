import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AI_ENABLED, translateFrameAI } from "@/lib/ai";
import { setFlow } from "@/lib/aiflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Translate an idea from one person's professional/disciplinary frame into
// another's. The heart of the cross-domain translator prototype.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!AI_ENABLED) return NextResponse.json({ error: "AI isn't configured." }, { status: 503 });

  let body: any = {};
  try { body = await request.json(); } catch { return NextResponse.json({ error: "bad request" }, { status: 400 }); }
  const idea = String(body.idea || "").trim();
  const senderRole = String(body.senderRole || "").trim();
  const recipientRole = String(body.recipientRole || "").trim();
  if (!idea) return NextResponse.json({ error: "Type an idea to translate." }, { status: 400 });
  if (!senderRole || !recipientRole) return NextResponse.json({ error: "Give both people a role or field." }, { status: 400 });

  setFlow("translate:frame");
  try {
    const out = await translateFrameAI({
      senderRole, senderBio: String(body.senderBio || "").slice(0, 4000),
      recipientRole, recipientBio: String(body.recipientBio || "").slice(0, 4000),
      idea,
    });
    if (!out || typeof out !== "object" || !out.translation) return NextResponse.json({ error: "Couldn't translate that. Try again." }, { status: 502 });
    return NextResponse.json({ ok: true, translation: out.translation, analogy: out.analogy || "", soWhat: out.soWhat || "" });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message?.slice(0, 200) || "Translation failed." }, { status: 500 });
  }
}
