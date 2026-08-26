import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { chatAdjudicateAI } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Host-only: the AI reads the whole chat and adjudicates it. Cached on the session.
export async function POST(request: Request) {
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
  const code = String(body.code || "").toUpperCase().trim();
  if (!code) return Response.json({ error: "Missing code." }, { status: 400 });

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return Response.json({ error: "Not available." }, { status: 500 });
  }

  const { data: session } = await admin.from("forum_sessions").select("id, topic, instructions, host_id").eq("code", code).maybeSingle();
  if (!session || session.host_id !== user.id) return Response.json({ error: "Not found." }, { status: 404 });

  const { data: msgs } = await admin
    .from("forum_messages")
    .select("name, text")
    .eq("session_id", session.id)
    .order("created_at", { ascending: true })
    .limit(600);
  const messages = ((msgs as any[]) || []).map((m) => ({ name: m.name || "anon", text: m.text || "" }));
  if (messages.length === 0) return Response.json({ ok: true, empty: true, total: 0 });

  let verdict;
  try {
    verdict = await chatAdjudicateAI({ topic: session.topic || "", instructions: session.instructions || "", messages });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Couldn't adjudicate." }, { status: 502 });
  }

  await admin.from("forum_sessions").update({ verdict, updated_at: new Date().toISOString() }).eq("id", session.id);
  return Response.json({ ok: true, verdict, total: messages.length });
}
