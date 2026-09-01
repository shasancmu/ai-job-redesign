import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roleFor, getActiveOrg, getOrgById } from "@/lib/orgs";
import { sendNote } from "@/lib/pushes";
import { draftReachOutAI, AI_ENABLED } from "@/lib/ai";
import { moduleByExercise } from "@/lib/modules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Draft-assist reach-out: the OS drafts a check-in grounded in what a person last
// did; the human edits and sends it in their own voice. Never auto-sent. Two
// actions — "draft" (returns a suggestion) and "send" (delivers one personal
// note). Gated to staff of the org, and the target must be in the org (the
// isolation boundary — you can only reach your own people).
async function resolveOrg(user: { id: string; email?: string | null }) {
  const role = await roleFor(user);
  const staffOrgIds = new Set([...role.directorOrgIds, ...role.programDirectorOrgIds, ...role.instructorOrgIds]);
  const active = await getActiveOrg(user).catch(() => null);
  if (active && (role.superadmin || staffOrgIds.has(active.id))) return active;
  const anyId = role.directorOrgIds[0] || role.programDirectorOrgIds[0] || role.instructorOrgIds[0];
  if (anyId) return await getOrgById(anyId);
  if (role.superadmin && active) return active;
  return null;
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  let body: any = {};
  try { body = await request.json(); } catch { return NextResponse.json({ error: "bad request" }, { status: 400 }); }
  const action = body.action === "send" ? "send" : "draft";
  const userId = String(body.userId || "");
  if (!userId) return NextResponse.json({ error: "Missing person." }, { status: 400 });

  const org = await resolveOrg(user);
  if (!org) return NextResponse.json({ error: "Not your organization." }, { status: 403 });

  const admin = createAdminClient();

  // The target must belong to this org's cohorts.
  const { data: classes } = await admin.from("classes").select("id, code").eq("org_id", org.id);
  const rows = ((classes as any[]) || []).filter(Boolean);
  const classIds = rows.map((c) => c.id);
  const cohortCodes = rows.map((c) => c.code).filter(Boolean);
  let isMember = false;
  if (classIds.length) {
    const { count } = await admin.from("class_members").select("user_id", { count: "exact", head: true }).eq("user_id", userId).in("class_id", classIds.slice(0, 4000));
    isMember = (count || 0) > 0;
  }
  if (!isMember) return NextResponse.json({ error: "That person isn't in your school." }, { status: 403 });

  if (action === "send") {
    const res = await sendNote(admin, { org, createdBy: user.id, userId, title: String(body.title || ""), body: String(body.body || "") });
    if (!res.ok) return NextResponse.json({ error: res.error || "Could not send." }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  // draft — gather just enough context to make it genuinely about this person.
  const { data: prof } = await admin.from("profiles").select("display_name").eq("id", userId).maybeSingle();
  const learnerName = (prof as any)?.display_name || "there";
  const { data: me } = await admin.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
  const senderName = (me as any)?.display_name || "";

  let lastModule: string | null = null;
  let quietDays: number | null = null;
  if (cohortCodes.length) {
    const { data: sess } = await admin
      .from("sessions").select("exercise, created_at")
      .in("cohort", cohortCodes.slice(0, 4000))
      .or(`host_id.eq.${userId},guest_id.eq.${userId}`)
      .order("created_at", { ascending: false }).limit(1);
    const s = ((sess as any[]) || [])[0];
    if (s) {
      lastModule = moduleByExercise(s.exercise)?.name || null;
      if (s.created_at) quietDays = Math.floor((Date.now() - new Date(s.created_at).getTime()) / 86_400_000);
    }
  }

  const firstL = learnerName.split(/\s+/)[0];
  const firstS = senderName ? senderName.split(/\s+/)[0] : "";
  // Fallback draft (also used when AI is off) — plain, specific, ask-free.
  const fallback = [
    `Hi ${firstL},`,
    "",
    lastModule ? `I was just thinking about our work together — I remember you were digging into ${lastModule}.` : "I was just thinking of you and wanted to check in.",
    "No agenda at all — I'd love to hear how things are going, and whether there's anything I can help with.",
    firstS ? `\n${firstS}` : "",
  ].filter((l) => l !== undefined).join("\n").trim();

  let draft = fallback;
  if (AI_ENABLED) {
    try {
      const ai = await draftReachOutAI({ learnerName, senderName, orgName: org.name, voice: (org as any).presence_voice || undefined, lastModule, quietDays });
      if (ai && ai.length > 20) draft = ai;
    } catch { /* keep fallback */ }
  }

  return NextResponse.json({ ok: true, draft, name: learnerName, lastModule, quietDays });
}
