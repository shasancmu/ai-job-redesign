import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Save a learner's post-report reflection: how close their prediction was
// (calibration) and an implementation intention (if-then + a date). Keyed by
// session code; owner-only. Stored in workspaces.canvas.reflection, and used
// later for the spaced follow-up. Fails soft.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const code = String(body.code || "");
    if (!code) return Response.json({ ok: false }, { status: 400 });

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return Response.json({ ok: false }, { status: 401 });

    const { data: session } = await supabase
      .from("sessions")
      .select("id,host_id,guest_id")
      .eq("code", code)
      .maybeSingle();
    if (!session) return Response.json({ ok: false }, { status: 404 });
    const mine = (session as any).host_id === user.id || (session as any).guest_id === user.id;
    if (!mine) return Response.json({ ok: false }, { status: 403 });

    const admin = createAdminClient();
    const { data: ws } = await admin
      .from("workspaces")
      .select("id,canvas")
      .eq("session_id", (session as any).id)
      .eq("author_id", user.id)
      .maybeSingle();
    if (!ws) return Response.json({ ok: false }, { status: 404 });

    // Merge into any existing reflection so the post-report save and the later
    // follow-up both write to the same object without clobbering each other.
    const prev = ((ws as any).canvas?.reflection as any) || {};
    const reflection: any = { ...prev };

    if (Number.isFinite(body.calibration)) reflection.calibration = Math.max(1, Math.min(5, body.calibration));
    const thenPart = String(body.thenPart || "").trim().slice(0, 200);
    if (thenPart) {
      const ifPart = String(body.ifPart || "").trim().slice(0, 200);
      const date = String(body.date || "").slice(0, 10);
      reflection.commitment = { ifPart, thenPart, date: date || undefined, text: ifPart ? `If ${ifPart}, then I will ${thenPart}` : thenPart };
    }
    // Follow-up capture (spaced check-in): recalled takeaway + outcome.
    if (typeof body.recall === "string") reflection.recall = body.recall.trim().slice(0, 500);
    if (typeof body.outcome === "string") reflection.outcome = body.outcome.slice(0, 40);
    if (body.recall !== undefined || body.outcome !== undefined) reflection.followedUpAt = new Date().toISOString();
    else reflection.at = new Date().toISOString();

    await admin
      .from("workspaces")
      .update({ canvas: { ...((ws as any).canvas || {}), reflection }, updated_at: new Date().toISOString() })
      .eq("id", (ws as any).id);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
