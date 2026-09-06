import { createClient } from "@/lib/supabase/server";
import { roleFor } from "@/lib/orgs";
import { saveAd, type AdInput } from "@/lib/ads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Create or update a program spotlight. Only a director of the target org (or a
// superadmin) may write.
export async function POST(request: Request) {
  const { data: { user } } = await createClient().auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any = {};
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const orgId = String(body?.orgId || "");
  if (!orgId) return Response.json({ error: "Missing org." }, { status: 400 });

  const role = await roleFor(user);
  if (!(role.superadmin || role.directorOrgIds.includes(orgId))) return Response.json({ error: "Only the organization's owner can create spotlights." }, { status: 403 });

  if (!body?.title || !String(body.title).trim()) return Response.json({ error: "A title is required." }, { status: 400 });

  const input: AdInput & { id?: string } = {
    id: body.id || undefined,
    emoji: body.emoji, title: body.title, tagline: body.tagline, body: body.body,
    image_url: body.image_url, cta_label: body.cta_label, cta_url: body.cta_url,
    status: body.status, starts_at: body.starts_at, ends_at: body.ends_at,
  };
  const ad = await saveAd(orgId, user.id, input);
  if (!ad) return Response.json({ error: "Couldn't save." }, { status: 500 });
  return Response.json({ ad });
}
