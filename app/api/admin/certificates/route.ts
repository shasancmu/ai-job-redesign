import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperadmin } from "@/lib/orgs";
import { cleanBundle, uniqueKey } from "@/lib/bundleAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  if (!(await isSuperadmin(user))) return Response.json({ error: "Superadmin only." }, { status: 403 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  const admin = createAdminClient();
  const action = String(body.action || "");

  try {
    if (action === "save") {
      const fields = cleanBundle(body);
      if (!fields.name) return Response.json({ error: "Name is required." }, { status: 400 });
      if (fields.core.length + fields.electives.length === 0)
        return Response.json({ error: "Add at least one module." }, { status: 400 });

      if (body.id) {
        // Update a global bundle only (org_id is null); don't touch org bundles here.
        const { data: existing } = await admin.from("bundles").select("id,org_id").eq("id", body.id).maybeSingle();
        if (!existing || (existing as any).org_id) return Response.json({ error: "Not found." }, { status: 404 });
        await admin
          .from("bundles")
          .update({ ...fields, updated_at: new Date().toISOString() })
          .eq("id", body.id);
        return Response.json({ ok: true, id: body.id });
      }

      const key = await uniqueKey(admin, fields.name);
      const { data, error } = await admin
        .from("bundles")
        .insert({ ...fields, key, org_id: null, created_by: user.id })
        .select("id")
        .maybeSingle();
      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ ok: true, id: (data as any)?.id });
    }

    if (action === "delete") {
      const { data: existing } = await admin.from("bundles").select("id,org_id").eq("id", body.id).maybeSingle();
      if (!existing || (existing as any).org_id) return Response.json({ error: "Not found." }, { status: 404 });
      await admin.from("bundles").delete().eq("id", body.id);
      return Response.json({ ok: true });
    }

    return Response.json({ error: "unknown action" }, { status: 400 });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Failed." }, { status: 500 });
  }
}
