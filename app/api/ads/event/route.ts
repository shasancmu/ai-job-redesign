import { createClient } from "@/lib/supabase/server";
import { getAdById, recordAdEvent, type AdEventKind } from "@/lib/ads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Log one spotlight interaction (impression / click / cta / interest). Called by
// the card (impression + click) and the landing page (cta + interest). Best
// effort: always 200 so a viewer request never fails on analytics.
export async function POST(request: Request) {
  let body: any = {};
  try { body = await request.json(); } catch { /* empty */ }
  const adId = String(body?.adId || "");
  const kind = String(body?.kind || "") as AdEventKind;
  const cohort = body?.cohort ? String(body.cohort).slice(0, 64) : null;
  const anonId = body?.anonId ? String(body.anonId).slice(0, 64) : null;
  if (!adId || !["impression", "click", "cta", "interest"].includes(kind)) return Response.json({ ok: false });

  // Resolve the org from the ad itself (never trust the client for attribution).
  const ad = await getAdById(adId);
  if (!ad) return Response.json({ ok: false });

  let userId: string | null = null;
  try { const { data: { user } } = await createClient().auth.getUser(); userId = user?.id || null; } catch { /* anon */ }

  await recordAdEvent(adId, kind, { orgId: ad.org_id, userId, anonId, cohort });
  return Response.json({ ok: true });
}
