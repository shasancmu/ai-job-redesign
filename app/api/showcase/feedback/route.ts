import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PUBLIC: an audience member submits feedback on the current presentation.
export async function POST(request: Request) {
  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const code = String(body.code || "").toUpperCase();
  const itemId = String(body.itemId || "");
  const name = String(body.name || "").trim().slice(0, 40);
  const text = String(body.text || "").trim().slice(0, 1500);
  let rating: number | null = Number(body.rating);
  rating = rating >= 1 && rating <= 5 ? Math.round(rating) : null;
  if (!code || !itemId || !text) return Response.json({ error: "Add your feedback first." }, { status: 400 });

  const admin = createAdminClient();
  const { data: session } = await admin.from("showcase_sessions").select("id, status").eq("code", code).maybeSingle();
  if (!session) return Response.json({ error: "Code not found." }, { status: 404 });
  if (session.status === "closed") return Response.json({ error: "This session is closed." }, { status: 403 });

  await admin.from("showcase_feedback").insert({ session_id: session.id, item_id: itemId, name, text, rating });
  return Response.json({ ok: true });
}
