import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, scienceIntelNarrateAI } from "@/lib/ai";
import { SCIENTIFIQ_ENABLED, ScientifiqError } from "@/lib/scientifiq";
import { talentMap, nationalCapability, emergingCompetitors } from "@/lib/scienceIntel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODES = new Set(["talent", "national", "competitors"]);

export async function POST(request: Request) {
  if (!SCIENTIFIQ_ENABLED) return Response.json({ error: "Scientifiq is not configured." }, { status: 503 });
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const mode = MODES.has(body.mode) ? body.mode : "talent";
  setFlow(`science-intel:${mode}`);

  try {
    let data: any;
    let subject = "";
    let summary = "";
    if (mode === "talent") {
      const field = String(body.field || "").trim().slice(0, 120);
      if (!field) return Response.json({ error: "Enter a technology or field." }, { status: 400 });
      data = await talentMap(field);
      if (!data.experts?.length) return Response.json({ error: "No experts found for that field. Try a broader term." }, { status: 404 });
      subject = field;
      summary = `Experts: ${data.experts.slice(0, 12).map((e: any) => `${e.name} (${e.org}${e.employer && !e.academic ? `, patents for ${e.employer}` : ""}) cp ${e.compot}`).join("; ")}\nTop corporate employers: ${data.topEmployers.map((x: any) => `${x.name} (${x.n})`).join(", ")}\nUnaffiliated strong people: ${data.unaffiliated.slice(0, 6).map((e: any) => e.name).join(", ")}`;
    } else if (mode === "national") {
      const countryId = String(body.countryId || "").trim().slice(0, 8);
      const countryName = String(body.countryName || "").trim().slice(0, 60) || countryId;
      if (!countryId) return Response.json({ error: "Pick a country." }, { status: 400 });
      data = await nationalCapability(countryId, countryName);
      subject = countryName;
      summary = `Strengths (field, researchers, avg commercial potential): ${data.strengths.map((s: any) => `${s.subfield} (${s.researchers}, cp ${s.avgCompot})`).join("; ")}\nTop researchers: ${data.topResearchers.slice(0, 8).map((r: any) => `${r.name} (${r.org}) cp ${r.compot}`).join("; ")}`;
    } else {
      const company = String(body.company || "").trim().slice(0, 120);
      if (!company) return Response.json({ error: "Enter a company name." }, { status: 400 });
      data = await emergingCompetitors(company);
      if (data.error) return Response.json({ error: data.error }, { status: 404 });
      subject = company;
      summary = `${company} cites ${data.citedCount} papers. Firms building on the same science (name, patents, latest year): ${data.competitors.map((c: any) => `${c.name} (${c.patents}, ${c.latestYear || "?"})`).join("; ")}`;
    }

    let narrate: any = null;
    if (AI_ENABLED) narrate = await scienceIntelNarrateAI({ mode, subject, summary }).catch(() => null);
    return Response.json({ mode, data, narrate });
  } catch (e: any) {
    if (e instanceof ScientifiqError) return Response.json({ error: e.message }, { status: e.status < 600 ? e.status : 502 });
    return Response.json({ error: e?.message || "Failed to run.", _diag: String(e?.stack || "").split("\n").slice(0, 8).join(" | ") }, { status: 500 });
  }
}
