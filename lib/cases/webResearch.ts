// Web research for the Living Case generator, via Tavily. Every call is metered
// against a HARD monthly cap so the platform is never billed past the free tier.
// The whole module fails CLOSED: no key, no counter, or over-cap => it returns an
// empty research block and the case still generates (from docs + model knowledge).

import { createAdminClient } from "@/lib/supabase/admin";

const TAVILY_KEY = process.env.TAVILY_API_KEY || "";
export const WEB_RESEARCH_ENABLED = !!TAVILY_KEY;

// Tavily's free tier is 1000 credits/month; stop well short so a burst or a race
// can never cross it. One case generation spends at most ONE credit.
const MONTHLY_CAP = Number(process.env.TAVILY_MONTHLY_CAP || 950);

const period = () => { const d = new Date(); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`; };

// Atomically claim one credit for this month. Returns true only if we are still
// within the cap. Any error (missing table/function, no admin client) => false,
// so we never search when we cannot prove we are under budget.
async function claimCredit(): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("incr_api_usage", { p_provider: "tavily", p_period: period() });
    if (error) return false;
    const count = Number(data);
    return Number.isFinite(count) && count <= MONTHLY_CAP;
  } catch { return false; }
}

type TavilyResult = { title: string; url: string; content: string };

async function tavilySearch(query: string): Promise<TavilyResult[]> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: TAVILY_KEY, query, search_depth: "advanced", max_results: 8, include_answer: false }),
  });
  if (!res.ok) return [];
  const data = await res.json().catch(() => null);
  return Array.isArray(data?.results) ? data.results.map((r: any) => ({ title: String(r.title || ""), url: String(r.url || ""), content: String(r.content || "") })) : [];
}

// Build a compact, citable research block for the case prompt. Flags YouTube
// results as video candidates. Returns "" when disabled or over budget.
export async function researchForCase(intent: string, sourceText: string): Promise<string> {
  if (!WEB_RESEARCH_ENABLED) return "";
  const query = (intent || sourceText.slice(0, 300)).replace(/\s+/g, " ").trim().slice(0, 380);
  if (!query) return "";
  if (!(await claimCredit())) return "";

  const results = await tavilySearch(query).catch(() => []);
  if (!results.length) return "";

  const isVideo = (u: string) => /youtube\.com\/watch|youtu\.be\//i.test(u);
  const lines = results.slice(0, 8).map((r) => {
    const snip = r.content.replace(/\s+/g, " ").trim().slice(0, 220);
    return `- ${isVideo(r.url) ? "[VIDEO] " : ""}${r.title} — ${r.url}\n  ${snip}`;
  });
  return lines.join("\n");
}
