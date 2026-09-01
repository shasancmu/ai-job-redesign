import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveOrg } from "@/lib/orgs";
import { AI_ENABLED, synthesizePortraitAI } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Close the interview: reflect it back to them (the moment of being seen) and
// store the portrait so their mentors can understand them. The person owns the
// row (RLS) and can delete it anytime.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!AI_ENABLED) return NextResponse.json({ error: "This isn't available right now." }, { status: 503 });

  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "bad request" }, { status: 400 }); }
  const transcript = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-60)
    .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 4000) }));
  if (transcript.filter((m: any) => m.role === "user").length < 2) {
    return NextResponse.json({ error: "Let's talk a little more first." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: prof } = await admin.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
  const name = (prof as any)?.display_name || undefined;

  let result: any = null;
  try { result = await synthesizePortraitAI({ transcript, name }); } catch { /* below */ }
  if (!result || typeof result !== "object" || !result.reflection) {
    return NextResponse.json({ error: "Couldn't quite gather that. Try once more?" }, { status: 502 });
  }

  // Store it, scoped to the person's active org (the relationship is with the
  // institution). If they have no org, we still show them the reflection.
  const org = await getActiveOrg(user).catch(() => null);
  if (org) {
    try {
      await admin.from("learner_portrait").upsert({
        user_id: user.id, org_id: org.id, transcript, portrait: result.portrait || null, reflection: result.reflection, updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,org_id" });
    } catch { /* table not migrated — reflection still returned */ }
  }

  return NextResponse.json({ ok: true, reflection: result.reflection, portrait: result.portrait || null, saved: !!org });
}
