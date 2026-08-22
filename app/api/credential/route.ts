import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { moduleByExercise } from "@/lib/modules";
import { BRAND } from "@/lib/brand";
import {
  completedSlugs,
  earnedFrom,
  materializeCredentials,
  linkedInAddUrl,
  credentialName,
  TRACKS,
} from "@/lib/credentials";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Given a finished session's code, return the credential the signed-in user
// earned for it (and any track it just completed), with ready-made verify +
// LinkedIn links. Powers the completion moment in the report. Fails soft:
// anything missing → { credential: null }, so the report never breaks.
export async function POST(request: Request) {
  try {
    const { code } = await request.json();
    if (!code || typeof code !== "string") return Response.json({ credential: null });

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return Response.json({ credential: null });

    // RLS lets the host/guest read their own session.
    const { data: session } = await supabase
      .from("sessions")
      .select("exercise,host_id,guest_id,status")
      .eq("code", code)
      .maybeSingle();
    if (!session || (session as any).status !== "done") return Response.json({ credential: null });

    const mine =
      (session as any).host_id === user.id || (session as any).guest_id === user.id;
    if (!mine) return Response.json({ credential: null });

    const mod = moduleByExercise((session as any).exercise);
    if (!mod || mod.partner === "group") return Response.json({ credential: null });

    const completed = await completedSlugs(supabase, user.id);
    const earned = earnedFrom(completed);

    const admin = createAdminClient();
    const idMap = await materializeCredentials(admin, user.id, earned);

    const exRow = idMap.get(`exercise:${mod.slug}`);
    if (!exRow) return Response.json({ credential: null });

    const abs = (id: string) => `${BRAND.siteUrl}/c/${id}`;
    const exName = credentialName(mod.slug);
    const d = exRow.earned_at ? new Date(exRow.earned_at) : null;
    const credential = {
      id: exRow.id,
      title: exName,
      viewUrl: `/c/${exRow.id}`,
      linkedinUrl: linkedInAddUrl({
        name: exName,
        certUrl: abs(exRow.id),
        certId: exRow.id,
        year: d ? d.getFullYear() : undefined,
        month: d ? d.getMonth() + 1 : undefined,
      }),
    };

    // A track this completion just finished (this module is one of its members
    // and the whole track is now earned).
    const trackDef = TRACKS.find(
      (t) => t.slugs.includes(mod.slug) && earned.tracks.some((et) => et.key === t.key),
    );
    let track = null;
    if (trackDef) {
      const tr = idMap.get(`track:${trackDef.key}`);
      if (tr) {
        const td = tr.earned_at ? new Date(tr.earned_at) : null;
        track = {
          id: tr.id,
          name: trackDef.name,
          viewUrl: `/c/${tr.id}`,
          linkedinUrl: linkedInAddUrl({
            name: trackDef.name,
            certUrl: abs(tr.id),
            certId: tr.id,
            year: td ? td.getFullYear() : undefined,
            month: td ? td.getMonth() + 1 : undefined,
          }),
        };
      }
    }

    return Response.json({ credential, track });
  } catch {
    return Response.json({ credential: null });
  }
}
