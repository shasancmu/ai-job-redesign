import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { facilitatorAccess, getActiveOrg } from "@/lib/orgs";
import { saveLivePrompt, deleteLivePrompt } from "@/lib/mechanics/livePromptStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Author a Live Prompt template (create / update / delete).
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!(await facilitatorAccess(user)).ok) return NextResponse.json({ error: "Instructors only." }, { status: 403 });

  let body: any = {};
  try { body = await request.json(); } catch { return NextResponse.json({ error: "bad request" }, { status: 400 }); }

  if (body.action === "delete") {
    if (!body.slug) return NextResponse.json({ error: "Missing slug." }, { status: 400 });
    await deleteLivePrompt(String(body.slug), user.id);
    return NextResponse.json({ ok: true });
  }

  const org = await getActiveOrg(user).catch(() => null);
  const res = await saveLivePrompt({
    slug: body.slug ? String(body.slug) : undefined,
    ownerId: user.id,
    orgId: org?.id || null,
    name: String(body.name || ""),
    emoji: body.emoji ? String(body.emoji) : undefined,
    prompt: String(body.prompt || ""),
    subtitle: body.subtitle ? String(body.subtitle) : undefined,
  });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
  return NextResponse.json({ ok: true, slug: res.slug });
}
