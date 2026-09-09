import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizePx, pxComplete } from "@/lib/paperx/sanitize";
import { PAPER_EXPLAINER_TYPE } from "@/lib/paperx/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 44) || "explainer";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const incoming = body.spec || body.genome;
  if (!incoming || typeof incoming !== "object") return Response.json({ error: "Missing explainer." }, { status: 400 });
  const genome = sanitizePx(incoming, String(incoming.title || "Paper Explainer"));
  if (incoming.access === "enrolled" || incoming.access === "public") genome.access = incoming.access;
  if (Array.isArray(incoming.cohorts)) genome.cohorts = incoming.cohorts.map((c: any) => String(c)).slice(0, 20);
  if (!pxComplete(genome)) return Response.json({ error: "The explainer is incomplete." }, { status: 400 });

  const admin = createAdminClient();
  const editSlug = typeof body.editSlug === "string" ? body.editSlug : "";
  const status = body.publish ? "published" : "draft";

  if (editSlug) {
    const { data: row } = await admin.from("custom_modules").select("author_id, super_type").eq("slug", editSlug).maybeSingle();
    if (!row || (row as any).super_type !== PAPER_EXPLAINER_TYPE) return Response.json({ error: "Not found." }, { status: 404 });
    if ((row as any).author_id !== user.id) return Response.json({ error: "Not yours to edit." }, { status: 403 });
    const { error } = await admin.from("custom_modules").update({ name: genome.title, spec: { ...genome, slug: editSlug }, status, updated_at: new Date().toISOString() }).eq("slug", editSlug);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ slug: editSlug });
  }

  let base = slugify(genome.title);
  let slug = base;
  for (let i = 2; i <= 30; i++) {
    const { data: hit } = await admin.from("custom_modules").select("slug").eq("slug", slug).maybeSingle();
    if (!hit) break;
    slug = `${base}-${i}`;
  }
  const { error } = await admin.from("custom_modules").insert({
    slug, exercise: `custom:${slug}`, name: genome.title, super_type: PAPER_EXPLAINER_TYPE,
    spec: { ...genome, slug }, org_id: null, status, author_id: user.id, updated_at: new Date().toISOString(),
  });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ slug });
}
