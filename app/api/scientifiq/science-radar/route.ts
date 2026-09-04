import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, scienceRadarNarrateAI } from "@/lib/ai";
import { SCIENTIFIQ_ENABLED, ScientifiqError } from "@/lib/scientifiq";
import { radarReport } from "@/lib/scienceRadar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Company (or domain) -> tech footprint -> scored frontier -> who's building on
// the same science -> the frontier you don't already cite.
export async function POST(request: Request) {
  if (!SCIENTIFIQ_ENABLED) return Response.json({ error: "Scientifiq is not configured." }, { status: 503 });
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const company = String(body.company || "").trim().slice(0, 120);
  const domain = String(body.domain || "").trim().slice(0, 200);
  if (!company && !domain) return Response.json({ error: "Enter a company name or a technology domain." }, { status: 400 });
  setFlow("science-radar");

  try {
    const r = await radarReport({ company: company || undefined, domain: domain || undefined });
    if ("error" in r) return Response.json({ error: r.error }, { status: r.status || 500 });

    let narrate: any = null;
    if (AI_ENABLED) {
      const experts = (r.data.topExperts || []).slice(0, 8).map((e: any) => `${e.name} (${e.org}) cp ${Math.round(e.compot)}`).join("; ");
      const firms = (r.firms?.firms || []).slice(0, 8).map((f: any) => `${f.name} (${f.patents})`).join("; ");
      narrate = await scienceRadarNarrateAI({
        mode: r.mode,
        subject: company || r.domainQuery,
        footprint: r.footprint?.found ? `${r.footprint.patentCount} patents in: ${(r.footprint.terms?.length ? r.footprint.terms : r.footprint.keywords).slice(0, 8).join(", ")}${r.footprint.areas?.length ? ` (${r.footprint.areas.join("; ")})` : ""}` : `domain: ${r.domainQuery}`,
        fields: (r.data.subfieldBreakdown || []).slice(0, 6).map((s: any) => s.name).join(", "),
        topExperts: experts,
        firms,
        whitespaceCount: r.whitespace.length,
        avgCommPot: Math.round(r.data.avgCommPot || 0),
      }).catch(() => null);
    }

    return Response.json({ report: r, narrate });
  } catch (e: any) {
    if (e instanceof ScientifiqError) return Response.json({ error: e.message }, { status: e.status < 600 ? e.status : 502 });
    return Response.json({ error: e?.message || "Failed to run the radar." }, { status: 500 });
  }
}
