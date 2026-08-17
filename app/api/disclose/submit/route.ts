import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PUBLIC, no-auth: a vendor submits their disclosure via the shared link. Keyed
// by the session code; writes into the buyer's workspace canvas.
export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  const token = String(body.token || "");
  if (!token) return Response.json({ error: "Missing link token." }, { status: 400 });

  // Sanitize responses to a flat map of capped strings.
  const responses: Record<string, string> = {};
  if (body.responses && typeof body.responses === "object") {
    for (const [k, v] of Object.entries(body.responses)) {
      if (typeof k === "string" && k.length < 80) responses[k] = String(v ?? "").slice(0, 6000);
    }
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return Response.json({ error: "Not available." }, { status: 500 });
  }

  const { data: session } = await admin.from("sessions").select("id, exercise").eq("public_token", token).maybeSingle();
  if (!session || !["disclosure", "disclosure-haip"].includes(session.exercise)) {
    return Response.json({ error: "This link isn't valid." }, { status: 404 });
  }

  const { data: ws } = await admin.from("workspaces").select("id, canvas").eq("session_id", session.id).limit(1).maybeSingle();
  if (!ws) return Response.json({ error: "This disclosure isn't set up yet." }, { status: 409 });

  const canvas = { ...((ws.canvas as any) || {}), responses, submittedAt: new Date().toISOString() };
  const { error } = await admin.from("workspaces").update({ canvas, updated_at: new Date().toISOString() }).eq("id", ws.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  await admin.from("sessions").update({ status: "done" }).eq("id", session.id);
  return Response.json({ ok: true });
}
