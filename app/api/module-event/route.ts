import { createClient } from "@/lib/supabase/server";
import { recordModuleEvent } from "@/lib/moduleEvents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Client beacon for module funnel events (drop-off), used by runners that have
// no server report route (e.g. the explainer walkthrough). Best-effort.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ ok: false }, { status: 401 });
  let body: any;
  try { body = await request.json(); } catch { return Response.json({ ok: false }, { status: 400 }); }
  const slug = String(body.slug || "");
  const kind = body.kind ? String(body.kind) : null;
  const stage = String(body.stage || "");
  if (!slug || !["start", "engage", "complete"].includes(stage)) return Response.json({ ok: false }, { status: 400 });
  await recordModuleEvent(slug, kind, stage, user.id);
  return Response.json({ ok: true });
}
