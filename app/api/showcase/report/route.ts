import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, showcaseReportAI } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// HOST ONLY: synthesize the audience feedback for one presentation into a report.
export async function POST(request: Request) {
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const code = String(body.code || "").toUpperCase();
  const itemId = String(body.itemId || "");
  if (!code || !itemId) return Response.json({ error: "missing fields" }, { status: 400 });
  setFlow("showcase:report");

  const admin = createAdminClient();
  const { data: session } = await admin.from("showcase_sessions").select("id, host_id, title, items, reports").eq("code", code).maybeSingle();
  if (!session || session.host_id !== user.id) return Response.json({ error: "not found" }, { status: 404 });

  const item = (Array.isArray(session.items) ? session.items : []).find((it: any) => it.id === itemId);
  if (!item) return Response.json({ error: "unknown item" }, { status: 400 });

  const { data: fb } = await admin.from("showcase_feedback").select("name, text, rating").eq("session_id", session.id).eq("item_id", itemId).order("created_at");

  try {
    const report = await showcaseReportAI({
      sessionTitle: session.title || "",
      itemTitle: item.title || "",
      presenter: item.presenter || "",
      feedback: (fb || []).map((f: any) => ({ name: f.name, text: f.text, rating: f.rating })),
    });
    if (!report) return Response.json({ error: "Couldn't build the report. Try again." }, { status: 502 });
    const reports = { ...((session.reports as any) || {}), [itemId]: report };
    await admin.from("showcase_sessions").update({ reports, updated_at: new Date().toISOString() }).eq("id", session.id);
    return Response.json({ report });
  } catch (e: any) {
    return Response.json({ error: e?.message || "AI request failed." }, { status: 500 });
  }
}
