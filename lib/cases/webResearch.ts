// Web research for the Living Case generator. Two capabilities:
//  1) ingestLinks — fetch + read the text of URLs the instructor pastes (free).
//  2) researchForCase — Tavily web search for real sources, videos, and images,
//     HARD-capped monthly so the platform is never billed past the free tier.
// Everything fails CLOSED: no key / no counter / over-cap => empty, never an error.

import { createAdminClient } from "@/lib/supabase/admin";

const TAVILY_KEY = process.env.TAVILY_API_KEY || "";
export const WEB_RESEARCH_ENABLED = !!TAVILY_KEY;

// Tavily's free tier is 1000 credits/month; stop well short so a burst or race
// can never cross it. One case generation spends at most ONE credit.
const MONTHLY_CAP = Number(process.env.TAVILY_MONTHLY_CAP || 950);

const period = () => { const d = new Date(); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`; };

// Atomically claim one credit for this month. Returns true only if still within
// the cap. Any error (missing table/function) => false, so we never search when
// we cannot prove we are under budget.
async function claimCredit(): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("incr_api_usage", { p_provider: "tavily", p_period: period() });
    if (error) return false;
    const count = Number(data);
    return Number.isFinite(count) && count <= MONTHLY_CAP;
  } catch { return false; }
}

// ---- Link ingestion (free: a plain fetch of a URL the instructor provided) ----

// Reject non-http(s) and obvious internal hosts (basic SSRF hygiene; the fetched
// text only ever feeds the LLM, never another user).
function safeUrl(raw: string): URL | null {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    const h = u.hostname.toLowerCase();
    if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return null;
    if (/^(127\.|10\.|192\.168\.|169\.254\.|::1|0\.)/.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h)) return null;
    return u;
  } catch { return null; }
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchUrlText(raw: string): Promise<{ url: string; text: string } | null> {
  const u = safeUrl(raw);
  if (!u) return null;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 12000);
  try {
    const res = await fetch(u.toString(), { headers: { "User-Agent": "Mozilla/5.0 (SuperadditiveCaseBot)" }, signal: ctl.signal, redirect: "follow" });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!/text\/html|text\/plain|application\/xhtml/.test(ct)) return null;
    const body = (await res.text()).slice(0, 400000);
    const text = /html/.test(ct) ? htmlToText(body) : body.replace(/\s+/g, " ").trim();
    return text.length > 120 ? { url: u.toString(), text: text.slice(0, 6000) } : null;
  } catch { return null; }
  finally { clearTimeout(timer); }
}

// Fetch a set of instructor-pasted links and return their text as one block.
export async function ingestLinks(links: string[]): Promise<string> {
  const urls = [...new Set((links || []).map((l) => String(l || "").trim()).filter(Boolean))].slice(0, 8);
  if (!urls.length) return "";
  const parts = await Promise.all(urls.map((u) => fetchUrlText(u).catch(() => null)));
  return parts.filter(Boolean).map((p) => `# ${p!.url}\n${p!.text}`).join("\n\n---\n\n");
}

// ---- Tavily research (metered) ----

export type Suggest = { url: string; title: string };
export type Research = { block: string; videos: Suggest[]; images: Suggest[] };
const EMPTY: Research = { block: "", videos: [], images: [] };

export async function researchForCase(intent: string, sourceText: string): Promise<Research> {
  if (!WEB_RESEARCH_ENABLED) return EMPTY;
  const query = (intent || sourceText.slice(0, 300)).replace(/\s+/g, " ").trim().slice(0, 380);
  if (!query) return EMPTY;
  if (!(await claimCredit())) return EMPTY;

  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: TAVILY_KEY, query, search_depth: "advanced", max_results: 10, include_images: true, include_answer: false }),
    });
    if (!res.ok) return EMPTY;
    const data = await res.json().catch(() => null);
    const results: any[] = Array.isArray(data?.results) ? data.results : [];
    const isVideo = (u: string) => /youtube\.com\/watch|youtu\.be\//i.test(u);
    const videos: Suggest[] = results.filter((r) => isVideo(String(r.url))).map((r) => ({ url: String(r.url), title: String(r.title || "Video") })).slice(0, 5);
    const images: Suggest[] = (Array.isArray(data?.images) ? data.images : []).map((im: any) => (typeof im === "string" ? { url: im, title: "" } : { url: String(im?.url || ""), title: String(im?.description || "") })).filter((i: Suggest) => /^https?:\/\//.test(i.url)).slice(0, 6);
    const block = results.slice(0, 8).map((r) => {
      const snip = String(r.content || "").replace(/\s+/g, " ").trim().slice(0, 220);
      return `- ${isVideo(String(r.url)) ? "[VIDEO] " : ""}${r.title} — ${r.url}\n  ${snip}`;
    }).join("\n");
    return { block, videos, images };
  } catch { return EMPTY; }
}
