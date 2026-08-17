import { createClient } from "@/lib/supabase/server";
import { AI_ENABLED, careerRoadmapAI, careerRoadmapInterview } from "@/lib/ai";
import { getUserLanguage, withLanguage } from "@/lib/lang";
import {
  matchOccupation,
  candidates,
  personVector,
  gapsFor,
  radarFor,
  tierOf,
  occSkill,
  SKILLS,
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

  const matches = matchOccupation(role, text);
  const current = matches[0];
  if (!current) return Response.json({ error: "Couldn't match your role to an occupation." }, { status: 422 });
  const cur = occSkill(current.code)!;
  const cands = candidates(current.code, 12);

  const currentTopSkills = SKILLS.map((s, i) => ({ name: s.name, im: cur.im[i], lv: cur.lv[i] }))
    .sort((a, b) => b.im - a.im)
    .slice(0, 10);

  let result: any;
  try {
    result = await withLanguage(lang, () =>
      careerRoadmapAI({
        text,
        role,
        level,
        transcript: body.messages || [],
        current: { code: current.code, title: current.title, zone: current.zone },
        currentTopSkills,
        skillNames: SKILLS.map((s) => s.name),
        candidates: cands.map((c) => ({ code: c.code, title: c.title, zone: c.zone, sim: c.sim })),
      })
    );
  } catch (e: any) {
    return Response.json({ error: e?.message || "Couldn't build the roadmap." }, { status: 502 });
  }

  const personLv = personVector(result?.personSkills, current.code);
  const candByCode = Object.fromEntries(cands.map((c) => [c.code, c]));

  // Validate AI-chosen targets against the candidate set; enrich with the real
  // numbers (sim, zone, radar, gaps) computed here.
  const seen = new Set<string>();
  const targets: any[] = [];
  for (const t of Array.isArray(result?.targets) ? result.targets : []) {
    const c = candByCode[t?.code];
    if (!c || seen.has(c.code)) continue;
    seen.add(c.code);
    targets.push({
      code: c.code,
      title: c.title,
      zone: c.zone,
      sim: c.sim,
      tier: ["lateral", "step_up", "stretch"].includes(t.tier) ? t.tier : tierOf(current.zone, c.zone, c.sim),
      why: String(t.why || ""),
      skillsToBuild: Array.isArray(t.skillsToBuild) ? t.skillsToBuild.slice(0, 4) : [],
      radar: radarFor(personLv, c.code),
      gaps: gapsFor(personLv, c.code),
    });
  }
  // Ensure at least 3 targets — backfill from top skill-similar candidates.
  for (const c of cands) {
    if (targets.length >= 3) break;
    if (seen.has(c.code)) continue;
    seen.add(c.code);
    targets.push({
      code: c.code, title: c.title, zone: c.zone, sim: c.sim,
      tier: tierOf(current.zone, c.zone, c.sim),
      why: "Strong skill overlap with your current role.",
      skillsToBuild: [],
      radar: radarFor(personLv, c.code),
      gaps: gapsFor(personLv, c.code),
    });
  }

  const map = cands.map((c) => ({
    code: c.code, title: c.title, zone: c.zone, sim: c.sim,
    selected: seen.has(c.code),
    tier: targets.find((t) => t.code === c.code)?.tier || null,
  }));

  const roadmap = {
    current: { code: current.code, title: current.title, zone: current.zone },
    strengths: Array.isArray(result?.strengths) ? result.strengths.slice(0, 6) : [],
    targets,
    map,
    plan: result?.roadmap && typeof result.roadmap === "object"
      ? { near: result.roadmap.near || [], mid: result.roadmap.mid || [], move: result.roadmap.move || [] }
      : { near: [], mid: [], move: [] },
    note: String(result?.note || ""),
  };

  return Response.json({ ok: true, roadmap });
}
