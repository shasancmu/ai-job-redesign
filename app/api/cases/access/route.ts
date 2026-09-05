import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeCode } from "@/lib/classes";
import { LIVING_CASE_TYPE } from "@/lib/cases/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Set a living case's access mode (public | enrolled) and the class codes it is
// assigned to. Author-gated. Only classes the author owns can be assigned.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const slug = String(body.slug || "").trim();
  const access = body.access === "enrolled" ? "enrolled" : "public";
  const requested = [...new Set((Array.isArray(body.cohorts) ? body.cohorts : []).map((c: any) => normalizeCode(String(c))).filter(Boolean))] as string[];
  if (!slug) return Response.json({ error: "Missing case." }, { status: 400 });

  const admin = createAdminClient();
  const { data: row } = await admin.from("custom_modules").select("author_id, spec").eq("slug", slug).eq("super_type", LIVING_CASE_TYPE).maybeSingle();
  if (!row) return Response.json({ error: "Case not found." }, { status: 404 });
  if ((row as any).author_id !== user.id) return Response.json({ error: "Not yours." }, { status: 403 });

  // Keep only class codes the author actually owns.
  let cohorts: string[] = [];
  if (requested.length) {
    const { data: owned } = await admin.from("classes").select("code").eq("owner_id", user.id).in("code", requested);
    cohorts = (owned || []).map((c: any) => c.code);
  }

  const spec = { ...((row as any).spec || {}), access, cohorts };
  const { error } = await admin.from("custom_modules").update({ spec, updated_at: new Date().toISOString() }).eq("slug", slug);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, access, cohorts });
}
