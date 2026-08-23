import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { moduleByExercise } from "@/lib/modules";
import { BRAND } from "@/lib/brand";
import { getMyOrgs } from "@/lib/orgs";
import {
  completedSlugs,
  bundlesFor,
  bundlesForSlug,
  loadBundles,
  materializeBundles,
  linkedInAddUrl,
} from "@/lib/credentials";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Given a finished session's code, power the completion moment. Certificates are
// earned by BUNDLES, not single exercises, so this returns either:
//   { certificate } — a bundle this completion just earned (celebrate + share), or
//   { progress }    — how much closer this got them to the nearest certificate.
// Fails soft: anything missing → nulls, so the report never breaks.
export async function POST(request: Request) {
  try {
    const { code } = await request.json();
    if (!code || typeof code !== "string") return Response.json({ certificate: null, progress: null });

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return Response.json({ certificate: null, progress: null });

    const { data: session } = await supabase
      .from("sessions")
      .select("exercise,host_id,guest_id,status")
      .eq("code", code)
      .maybeSingle();
    if (!session || (session as any).status !== "done") return Response.json({ certificate: null, progress: null });

    const mine = (session as any).host_id === user.id || (session as any).guest_id === user.id;
    if (!mine) return Response.json({ certificate: null, progress: null });

    const mod = moduleByExercise((session as any).exercise);
    if (!mod || mod.partner === "group") return Response.json({ certificate: null, progress: null });

    const admin = createAdminClient();
    const myOrgs = await getMyOrgs(user.id).catch(() => []);
    const defs = await loadBundles(admin, { orgIds: myOrgs.map((m) => m.org.id) });

    // Which bundles does this module even belong to?
    const memberBundleKeys = new Set(bundlesForSlug(mod.slug, defs).map((b) => b.key));
    if (memberBundleKeys.size === 0) return Response.json({ certificate: null, progress: null });

    const completed = await completedSlugs(supabase, user.id);
    const bundles = bundlesFor(completed, defs);

    const idMap = await materializeBundles(admin, user.id, bundles);
    const abs = (id: string) => `${BRAND.siteUrl}/c/${id}`;

    // A certificate this module just completed (member bundle, now earned).
    const earnedBundle = bundles.find((b) => b.earned && memberBundleKeys.has(b.key));
    if (earnedBundle) {
      const row = idMap.get(`track:${earnedBundle.key}`);
      if (row) {
        const d = row.earned_at ? new Date(row.earned_at) : null;
        return Response.json({
          certificate: {
            id: row.id,
            name: earnedBundle.name,
            viewUrl: `/c/${row.id}`,
            linkedinUrl: linkedInAddUrl({
              name: earnedBundle.name,
              certUrl: abs(row.id),
              certId: row.id,
              year: d ? d.getFullYear() : undefined,
              month: d ? d.getMonth() + 1 : undefined,
            }),
          },
          progress: null,
        });
      }
    }

    // Otherwise: the member bundle they're closest to finishing → a nudge.
    const nearest = bundles
      .filter((b) => !b.earned && memberBundleKeys.has(b.key))
      .sort((a, b) => a.remaining - b.remaining)[0];
    if (nearest) {
      return Response.json({
        certificate: null,
        progress: { name: nearest.name, remaining: nearest.remaining, progressPct: nearest.progressPct },
      });
    }

    return Response.json({ certificate: null, progress: null });
  } catch {
    return Response.json({ certificate: null, progress: null });
  }
}
