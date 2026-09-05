import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeGenome, genomeComplete } from "@/lib/cases/sanitize";
import { caseBySlug } from "@/lib/cases/registry";
import { LIVING_CASE_TYPE } from "@/lib/cases/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 44) || "case";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  // Re-sanitize on the way in — never trust a client-supplied genome shape. Keep
  // any verified media the editor added (sanitize strips only what the AI invents).
  const incoming = body.spec || body.genome;
  if (!incoming || typeof incoming !== "object") return Response.json({ error: "Missing case." }, { status: 400 });
  const genome = sanitizeGenome(incoming, String(incoming.title || "Case"));
  // The editor may attach verified videos the generator is forbidden from inventing.
  if (incoming.openingVideo?.youtubeId) genome.openingVideo = { youtubeId: String(incoming.openingVideo.youtubeId).slice(0, 20), title: String(incoming.openingVideo.title || "").slice(0, 200) };
  if (!genomeComplete(genome)) return Response.json({ error: "The case is incomplete." }, { status: 400 });

  const admin = createAdminClient();
  const editSlug = typeof body.editSlug === "string" ? body.editSlug : "";
  const status = body.publish ? "published" : "draft";

  if (editSlug) {
    const { data: row } = await admin.from("custom_modules").select("author_id, super_type").eq("slug", editSlug).maybeSingle();
    if (!row || (row as any).super_type !== LIVING_CASE_TYPE) return Response.json({ error: "Not found." }, { status: 404 });
    if ((row as any).author_id !== user.id) return Response.json({ error: "Not yours to edit." }, { status: 403 });
    const { error } = await admin.from("custom_modules").update({ name: genome.title, spec: { ...genome, slug: editSlug }, status, updated_at: new Date().toISOString() }).eq("slug", editSlug);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ slug: editSlug });
  }

  // Unique slug across built-ins + existing custom modules.
  let base = slugify(genome.title);
  if (caseBySlug(base)) base = `c-${base}`;
  let slug = base;
  for (let i = 2; i <= 30; i++) {
    const { data: hit } = await admin.from("custom_modules").select("slug").eq("slug", slug).maybeSingle();
    if (!hit) break;
    slug = `${base}-${i}`;
  }
  const { error } = await admin.from("custom_modules").insert({
    slug, exercise: `custom:${slug}`, name: genome.title, super_type: LIVING_CASE_TYPE,
    spec: { ...genome, slug }, org_id: null, status, author_id: user.id, updated_at: new Date().toISOString(),
  });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ slug });
}
