import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Delete one of your own rooms. Only the host may delete (they created it);
// child rows (workspaces / workflow_docs) cascade on the foreign key.
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  const id = body.id ? String(body.id) : null;
  if (!id) return Response.json({ error: "missing id" }, { status: 400 });

  // Verify ownership (RLS lets the host read their own session).
  const { data: session } = await supabase
    .from("sessions")
    .select("id, host_id")
    .eq("id", id)
    .maybeSingle();
  if (!session) return Response.json({ error: "not found" }, { status: 404 });
  if (session.host_id !== user.id) {
    return Response.json({ error: "Only the person who started the room can delete it." }, { status: 403 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return Response.json({ error: "service role not set" }, { status: 500 });
  }
  const { error } = await admin.from("sessions").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
