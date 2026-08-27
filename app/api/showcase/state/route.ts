import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PUBLIC: the shared showcase state, polled by the audience and the presenter.
export async function POST(request: Request) {
  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const code = String(body.code || "").toUpperCase();
  if (!code) return Response.json({ error: "missing code" }, { status: 400 });

  const admin = createAdminClient();
  const { data: session } = await admin
    .from("showcase_sessions")
    .select("id, title, items, current, status, reports")
    .eq("code", code)
    .maybeSingle();
  if (!session) return Response.json({ error: "Code not found." }, { status: 404 });

  const { data: fb } = await admin.from("showcase_feedback").select("item_id").eq("session_id", session.id);
  const counts: Record<string, number> = {};
  for (const f of fb || []) counts[(f as any).item_id] = (counts[(f as any).item_id] || 0) + 1;

  return Response.json({
    title: session.title || "",
    items: session.items || [],
    current: session.current,
    status: session.status,
    counts,
    reportItems: Object.keys((session.reports as any) || {}),
  });
}
