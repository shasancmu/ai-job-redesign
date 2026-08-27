import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, wmsFromInterviewAI, businessProfileAI } from "@/lib/ai";
import { wmsScore } from "@/lib/census";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// PUBLIC: finish a business profile. Scores the WMS (from typed answers or the
// interview transcript), generates the instant report, and writes one firm-wave
// record. Returns the report to show the respondent.
export async function POST(request: Request) {
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });
  let b: any;
  try { b = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }

  const r = b.record || {};
  setFlow("census:submit");

  // WMS from typed Likert answers, else scored from the interview transcript.
  let answers: Record<string, number> = (r.wmsAnswers && typeof r.wmsAnswers === "object") ? r.wmsAnswers : {};
  if (Object.keys(answers).length === 0 && r.transcript) {
    try { answers = await wmsFromInterviewAI(String(r.transcript)); } catch { answers = {}; }
  }
  const score = Object.keys(answers).length ? wmsScore(answers) : { overall: 0, byArea: {} as Record<string, number> };

  const photoDescs = (Array.isArray(r.photos) ? r.photos : []).map((p: any) => (p?.title ? `${p.title}: ${p.description || ""}` : p?.description || "")).filter(Boolean);

  let report: any = null;
  try {
    report = await businessProfileAI({
      name: r.name || "This business",
      industry: r.naics_label || r.industry_desc || "unspecified",
      size: r.employees_band || "unknown",
      customer: r.customer_type || "unknown",
      ownership: r.ownership || "unknown",
      wms: { overall: score.overall, byArea: score.byArea },
      whatItDoes: r.industry_desc || "",
      photos: photoDescs,
      transcript: r.transcript || "",
    });
  } catch { report = null; }

  // Who submitted (optional; the flow is public).
  let ownerId: string | null = null;
  try { const sb = createClient(); const { data: { user } } = await sb.auth.getUser(); ownerId = user?.id || null; } catch {}

  // Panel identity. A new profile of the SAME firm is a new wave linked by
  // firm_id, never a replacement. Match by the re-survey code if the respondent
  // came back via their update link, else by a name+place fingerprint.
  const campaign = String(b.campaign || "").toUpperCase() || null;
  const norm = (s: any) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const firmKey = `${norm(r.name)}|${norm(r.locality || r.admin1 || r.country)}`;
  const firmCodeIn = String(b.firmCode || "").toUpperCase();
  const admin0 = createAdminClient();
  let firmId: string | null = null;
  let firmCode: string | null = null;
  let wave = 1;
  try {
    let prior: any = null;
    if (firmCodeIn) {
      const { data } = await admin0.from("businesses").select("firm_id, firm_code, wave").eq("firm_code", firmCodeIn).order("wave", { ascending: false }).limit(1).maybeSingle();
      prior = data;
    }
    if (!prior && campaign && norm(r.name)) {
      const { data } = await admin0.from("businesses").select("firm_id, firm_code, wave").eq("campaign_code", campaign).eq("firm_key", firmKey).order("wave", { ascending: false }).limit(1).maybeSingle();
      prior = data;
    }
    if (prior?.firm_id) { firmId = prior.firm_id; firmCode = prior.firm_code; wave = (Number(prior.wave) || 1) + 1; }
  } catch { /* new firm */ }
  if (!firmId) { firmId = (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.round(Math.random() * 1e9)}`); firmCode = ("B" + Math.random().toString(36).slice(2, 7)).toUpperCase(); wave = 1; }

  const row: any = {
    campaign_code: campaign,
    owner_id: ownerId,
    firm_id: firmId,
    firm_key: firmKey,
    firm_code: firmCode,
    wave,
    name: String(r.name || "").slice(0, 200),
    address: String(r.address || "").slice(0, 400),
    lat: typeof r.lat === "number" ? r.lat : null,
    lng: typeof r.lng === "number" ? r.lng : null,
    country: r.country || null,
    admin1: r.admin1 || null,
    locality: r.locality || null,
    geo_source: r.geo_source || null,
    industry_desc: String(r.industry_desc || "").slice(0, 600),
    naics: r.naics || null,
    naics_label: r.naics_label || null,
    isic: r.isic || null,
    isic_label: r.isic_label || null,
    classify_conf: typeof r.classify_conf === "number" ? r.classify_conf : null,
    employees_band: r.employees_band || null,
    revenue_band: r.revenue_band || null,
    founded_year: typeof r.founded_year === "number" ? r.founded_year : null,
    multi_site: typeof r.multi_site === "boolean" ? r.multi_site : null,
    customer_type: r.customer_type || null,
    ownership: r.ownership || null,
    what_it_does: report?.headline || null,
    business_model: report?.model?.popcorn || null,
    wms: { answers, ...score },
    wms_overall: score.overall || null,
    tech: r.tech || null,
    network: Array.isArray(r.network) ? r.network : null,
    photos: Array.isArray(r.photos) ? r.photos : null,
    transcript: r.transcript || null,
    mode: r.mode || null,
    source_channel: b.source || null,
    consent: !!r.consent,
    contact_email: r.contact_email || null,
    report,
  };

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from("businesses").insert(row).select("id").single();
    if (error) return Response.json({ error: "Couldn't save. Try again." }, { status: 500 });
    return Response.json({ ok: true, id: data.id, report, wms: score, firmCode, wave });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Save failed." }, { status: 500 });
  }
}
