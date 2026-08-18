import { createClient } from "@/lib/supabase/server";
import { AI_ENABLED, careerRoadmapAI, careerRoadmapProfileAI, careerRoadmapInterview } from "@/lib/ai";
import { getUserLanguage, withLanguage } from "@/lib/lang";
import {
  matchOccupation,
  matchTitle,
  candidates,
  personVector,
  gapsFor,
  radarFor,
  tierBand,
  SKILLS,
  type Candidate,
} from "@/lib/careerRoadmap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 400 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const lang = await getUserLanguage(supabase, user.id);

  // ---- interview turn ------------------------------------------------------
  if (body.mode === "chat") {
    const reply = await withLanguage(lang, () =>
      careerRoadmapInterview(body.messages || [], { role: String(body.role || "") })
    );
    return Response.json({ reply });
  }

  // ---- full roadmap analysis ----------------------------------------------
  const text = String(body.text || "").trim();
  if (text.length < 60) return Response.json({ error: "Paste a bit more of your résumé first." }, { status: 400 });
  const role = String(body.role || "").slice(0, 200);
  const level = String(body.level || "").slice(0, 60);
  const transcript = body.messages || [];

  try {
    // Pass 1: the AI reads the résumé — skills, strengths, and the anchor
    // occupations that best capture the person (never surfaced to the user).
    const profile = await withLanguage(lang, () =>
      careerRoadmapProfileAI({ text, level, transcript, skillNames: SKILLS.map((s) => s.name) })
    );
    const personLv = personVector(profile?.personSkills);

    // Turn the AI-named anchors into O*NET codes (strict match); fall back to the
    // résumé/role keyword match if none survive. Candidate next steps = the
    // union of those anchors' skill-neighbors.
    const anchorCodes = new Set<string>();
    for (const a of Array.isArray(profile?.anchors) ? profile.anchors.slice(0, 4) : []) {
      const m = matchTitle(String(a || ""));
      if (m) anchorCodes.add(m.code);
    }
    if (anchorCodes.size === 0) {
      const fb = matchOccupation(role, text, 1)[0];
      if (fb && fb.score > 0) anchorCodes.add(fb.code);
    }
    if (anchorCodes.size === 0) {
      return Response.json({ error: "Couldn't match your background. Add your current role and more résumé detail." }, { status: 422 });
    }

    const pool = new Map<string, Candidate>();
    for (const ac of anchorCodes) {
      for (const c of candidates(ac, 12)) {
        if (anchorCodes.has(c.code)) continue; // targets are moves, not the anchor itself
        const prev = pool.get(c.code);
        if (!prev || c.sim > prev.sim) pool.set(c.code, c);
      }
    }
    const cands = [...pool.values()].sort((a, b) => b.sim - a.sim).slice(0, 16);
    if (cands.length === 0) {
      return Response.json({ error: "Couldn't find enough adjacent roles. Add more résumé detail." }, { status: 422 });
    }
    const candByCode = Object.fromEntries(cands.map((c) => [c.code, c]));

    // Pass 2: pick + narrate the targets.
    const result = await withLanguage(lang, () =>
      careerRoadmapAI({
        text,
        level,
        transcript,
        candidates: cands.map((c) => ({ code: c.code, title: c.title, zone: c.zone, sim: c.sim })),
      })
    );

    const seen = new Set<string>();
    const targets: any[] = [];
    const pushTarget = (c: Candidate, why: string, skillsToBuild: any[]) => {
      seen.add(c.code);
      targets.push({
        code: c.code,
        title: c.title,
        zone: c.zone,
        wage: c.wage,
        sim: c.sim,
        tier: tierBand(c.sim),
        why,
        skillsToBuild,
        radar: radarFor(personLv, c.code),
        gaps: gapsFor(personLv, c.code),
      });
    };
    for (const t of Array.isArray(result?.targets) ? result.targets : []) {
      const c = candByCode[t?.code];
      if (!c || seen.has(c.code)) continue;
      pushTarget(c, String(t.why || ""), Array.isArray(t.skillsToBuild) ? t.skillsToBuild.slice(0, 4) : []);
    }
    for (const c of cands) {
      if (targets.length >= 5) break;
      if (seen.has(c.code)) continue;
      pushTarget(c, "Strong skill overlap with your profile.", []);
    }

    // Map: only the vetted targets are plotted — positioned by skill match to you
    // (x) and the role's real median pay (y). "You" is a reference at max
    // transferability; we never guess the person's own salary.
    const map = targets.map((t) => ({
      code: t.code,
      title: t.title,
      zone: t.zone,
      wage: t.wage,
      sim: t.sim,
      selected: true,
      tier: t.tier,
    }));

    const roadmap = {
      strengths: Array.isArray(profile?.strengths) ? profile.strengths.slice(0, 6) : [],
      targets,
      map,
      plan:
        result?.roadmap && typeof result.roadmap === "object"
          ? { near: result.roadmap.near || [], mid: result.roadmap.mid || [], move: result.roadmap.move || [] }
          : { near: [], mid: [], move: [] },
      note: String(result?.note || ""),
    };

    return Response.json({ ok: true, roadmap });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Couldn't build the roadmap." }, { status: 502 });
  }
}
