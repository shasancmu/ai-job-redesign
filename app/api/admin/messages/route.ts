import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperadmin } from "@/lib/orgs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Superadmin-only: mark a contact message handled / unhandled, or delete it.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  if (!(await isSuperadmin(user))) return Response.json({ error: "Superadmin only." }, { status: 403 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const id = String(body.id || "");
  if (!id) return Response.json({ error: "missing id" }, { status: 400 });
  const admin = createAdminClient();

  if (body.action === "delete") {
    await admin.from("contact_messages").delete().eq("id", id);
    return Response.json({ ok: true });
  }
  await admin.from("contact_messages").update({ handled: body.handled !== false }).eq("id", id);
  return Response.json({ ok: true });
}
