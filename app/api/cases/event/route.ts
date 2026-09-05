import { createClient } from "@/lib/supabase/server";
import { logCaseEvent, type CaseEventKind } from "@/lib/cases/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS = new Set<CaseEventKind>(["open", "complete", "commit", "link_click"]);

// Best-effort engagement beacon from the case reader. Sign-in is optional: the
// user_id is derived from the session cookie when present; otherwise an anon id
// (per browser) ties events together. Always returns 200 so a student's read is
// never interrupted by tracking.
export async function POST(request: Request) {
  try {
    let body: any = {};
    try { body = await request.json(); } catch { /* sendBeacon may send text */ }
    const slug = String(body.slug || "").trim().slice(0, 80);
    const kind = String(body.kind || "") as CaseEventKind;
    if (!slug || !KINDS.has(kind)) return Response.json({ ok: false });

    let userId: string | null = null;
    try { const { data: { user } } = await createClient().auth.getUser(); userId = user?.id || null; } catch { /* anon */ }

    const data: Record<string, unknown> = {};
    if (kind === "commit") { data.label = String(body.label || body.choice || "").slice(0, 80); if (body.confidence != null) data.confidence = Number(body.confidence) || 0; }
    if (kind === "link_click") data.url = String(body.url || "").slice(0, 400);

    await logCaseEvent({ slug, kind, userId, anonId: body.anonId ? String(body.anonId) : null, cohort: body.cohort ? String(body.cohort) : null, data });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false });
  }
}
