import { createClient } from "@/lib/supabase/server";
import { roleFor } from "@/lib/orgs";
import { saveDeck } from "@/lib/decks";
import type { Slide } from "@/lib/deckTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Save (create/update) a presentation. Instructors, directors, and superadmins
// may author. The org_id is informational (decks are presented by their author).
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  const role = await roleFor(user);
  const canAuthor = role.superadmin || role.directorOrgIds.length > 0 || role.instructorOrgIds.length > 0;
  if (!canAuthor) return Response.json({ error: "Only instructors, directors, and superadmins can build presentations." }, { status: 403 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const title = String(body.title || "");
  const slides = Array.isArray(body.slides) ? (body.slides as Slide[]) : null;
  if (!slides) return Response.json({ error: "Missing slides." }, { status: 400 });

  const orgId = role.directorOrgIds[0] || role.instructorOrgIds[0] || null;
  const status = body.status === "draft" ? "draft" : "published";
  const editSlug = typeof body.editSlug === "string" && body.editSlug ? body.editSlug : undefined;

  const res = await saveDeck({ userId: user.id, title, slides, orgId, status, editSlug });
  if ("error" in res) return Response.json({ error: res.error }, { status: 400 });
  return Response.json({ ok: true, slug: res.slug, slides: res.slides });
}
