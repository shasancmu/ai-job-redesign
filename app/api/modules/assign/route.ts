import { createClient } from "@/lib/supabase/server";
import { assignableTargets, currentAssignment, reconcileAssignment } from "@/lib/moduleAssign";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET  ?slug=X  -> the classes/programs the user can assign to, and which already
//                 have this module. POST { slug, classIds, unitIds } reconciles.
// Reusable across every module type — a post-publish assignment step.
export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  const slug = String(new URL(request.url).searchParams.get("slug") || "").trim();
  if (!slug) return Response.json({ error: "Missing module." }, { status: 400 });

  const targets = await assignableTargets(user);
  const current = await currentAssignment(slug, targets);
  return Response.json({ classes: targets.classes, units: targets.units, classIds: current.classIds, unitIds: current.unitIds });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const slug = String(body.slug || "").trim();
  if (!slug) return Response.json({ error: "Missing module." }, { status: 400 });
  const classIds = (Array.isArray(body.classIds) ? body.classIds : []).map(String);
  const unitIds = (Array.isArray(body.unitIds) ? body.unitIds : []).map(String);

  try {
    await reconcileAssignment(user, slug, classIds, unitIds);
    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Couldn't update assignments." }, { status: 500 });
  }
}
