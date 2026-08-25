import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, domainScanAI } from "@/lib/ai";
import { SCIENTIFIQ_ENABLED, ScientifiqError } from "@/lib/scientifiq";
import { gatherDomainData, domainDataForPrompt } from "@/lib/domainScan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODES = new Set(["landscape", "deal-sourcing", "scorecard", "trajectory"]);

// Shared handler for the four landscape modules: gather the domain data, then
// run the mode-specific AI framing over it.
export async function POST(request: Request) {
  if (!SCIENTIFIQ_ENABLED) return Response.json({ error: "Scientifiq is not configured." }, { status: 503 });
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const m = MODES.has(String(body.mode)) ? String(body.mode) : "landscape";
  setFlow(`domain-scan:${m}`);
  const domain = String(body.domain || "").trim().slice(0, 200);
  const scopeKind = ["org", "region", "global"].includes(body.scopeKind) ? body.scopeKind : (m === "scorecard" ? "org" : "global");
  const orgQuery = String(body.orgQuery || "").trim().slice(0, 120);
  if (domain.length < 2) return Response.json({ error: "Enter a technology or field." }, { status: 400 });
  if (scopeKind === "org" && !orgQuery) return Response.json({ error: "Name the institution." }, { status: 400 });

  try {
    const g = await gatherDomainData({ domain, scopeKind, orgQuery });
    if ("error" in g) return Response.json({ error: g.error }, { status: g.status });
    const read = await domainScanAI({ mode: m, dataText: domainDataForPrompt(g.data) });
    if (!read) return Response.json({ error: "Gathered the data but couldn't write the read. Try again." }, { status: 502 });
    return Response.json({ data: g.data, read, scopeLabel: g.scopeLabel });
  } catch (e: any) {
    if (e instanceof ScientifiqError) return Response.json({ error: e.message }, { status: e.status < 600 ? e.status : 502 });
    return Response.json({ error: e?.message || "Failed to run the scan." }, { status: 500 });
  }
}
