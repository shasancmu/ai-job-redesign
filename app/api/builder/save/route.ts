import { createClient } from "@/lib/supabase/server";
import { roleFor } from "@/lib/orgs";
import { saveCustomModule } from "@/lib/customModules";
import type { BuilderSpec } from "@/lib/moduleBuilder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Save (create/update) an author-built module. Only org directors and
// superadmins may author. Scope is decided HERE, never trusted from the client:
//   - global (everyone sees it)  -> superadmin only
//   - org (that org's members)   -> director of that org
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  const role = await roleFor(user);
  const canAuthor = role.superadmin || role.directorOrgIds.length > 0;
  if (!canAuthor) return Response.json({ error: "Only organization directors and superadmins can build modules." }, { status: 403 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const spec = body.spec as BuilderSpec;
  if (!spec || typeof spec !== "object") return Response.json({ error: "Missing module spec." }, { status: 400 });

  // Decide the scope server-side.
  const wantsGlobal = body.scope === "global";
  if (wantsGlobal && !role.superadmin) return Response.json({ error: "Only a superadmin can publish a module platform-wide." }, { status: 403 });
  let orgId: string | null;
  if (wantsGlobal) {
    orgId = null;
  } else if (role.directorOrgIds.length > 0) {
    const req = String(body.orgId || "");
    orgId = role.directorOrgIds.includes(req) ? req : role.directorOrgIds[0];
  } else if (role.superadmin) {
    orgId = null; // superadmin who runs no org → global by default
  } else {
    return Response.json({ error: "No organization to publish to." }, { status: 403 });
  }

  const status = body.status === "draft" ? "draft" : "published";
  const editSlug = typeof body.editSlug === "string" && body.editSlug ? body.editSlug : undefined;

  const res = await saveCustomModule({ userId: user.id, spec, orgId, status, editSlug });
  if ("error" in res) return Response.json({ error: res.error }, { status: 400 });
  return Response.json({ ok: true, slug: res.slug, exercise: res.exercise, scope: orgId ? "org" : "global" });
}
