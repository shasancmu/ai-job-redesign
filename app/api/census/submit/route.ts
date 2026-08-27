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

  const row: any = {
    campaign_code: String(b.campaign || "").toUpperCase() || null,
    owner_id: ownerId,
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
    return Response.json({ ok: true, id: data.id, report, wms: score });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Save failed." }, { status: 500 });
  }
}
