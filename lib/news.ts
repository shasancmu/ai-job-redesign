// Current-news fetch for the "In the News" module. Keyless by default via Google
// News RSS (no API key needed); if NEWS_API_KEY is set, uses NewsAPI.org for
// richer descriptions. Returns a small list of recent, real stories.
export type NewsItem = { title: string; source: string; date: string; snippet: string; url: string };

function stripTags(s: string): string { return String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }
function unCdata(s: string): string { return String(s || "").replace(/<!\[CDATA\[|\]\]>/g, "").trim(); }
function decode(s: string): string {
  return String(s || "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => { try { return String.fromCharCode(+d); } catch { return ""; } })
    .replace(/\s+/g, " ").trim();
}
function norm(s: string): string { return s.toLowerCase().replace(/[^a-z0-9]/g, ""); }

export async function fetchNews(query: string, limit = 6): Promise<NewsItem[]> {
  const q = String(query || "").trim();
  if (!q) return [];
  const key = process.env.NEWS_API_KEY;
  try {
    if (key) {
      const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&sortBy=publishedAt&language=en&pageSize=${limit}&apiKey=${key}`;
      const res = await fetch(url, { headers: { "User-Agent": "Superadditive/1.0" }, cache: "no-store" });
      const d = await res.json().catch(() => ({}));
      const arts = Array.isArray(d.articles) ? d.articles : [];
      const out = arts.slice(0, limit).map((a: any): NewsItem => ({
        title: decode(String(a.title || "")), source: a.source?.name || "", date: a.publishedAt || "",
        snippet: decode(String(a.description || "")).slice(0, 320), url: a.url || "",
      })).filter((x: NewsItem) => x.title && x.url);
      if (out.length) return out;
    }
  } catch { /* fall through to keyless */ }

  // Keyless: Google News RSS search.
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; Superadditive/1.0)" }, cache: "no-store" });
    const xml = await res.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, limit).map((m) => {
      const block = m[1];
      const pick = (tag: string) => { const mm = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`)); return mm ? decode(unCdata(mm[1])) : ""; };
      let title = pick("title");
      const link = pick("link");
      const date = pick("pubDate");
      let source = pick("source");
      let snippet = decode(stripTags(pick("description")));
      // Google News titles are "Headline - Source"; drop the trailing source.
      if (source && title.endsWith(" - " + source)) title = title.slice(0, -(source.length + 3)).trim();
      else if (!source && / - [^-]+$/.test(title)) { const parts = title.split(" - "); source = parts.pop() || ""; title = parts.join(" - ").trim(); }
      // The RSS description is usually just the title repeated; drop if redundant.
      if (!snippet || norm(snippet).includes(norm(title)) || norm(title).includes(norm(snippet))) snippet = "";
      return { title, source: source.trim(), date, snippet: snippet.slice(0, 320), url: link } as NewsItem;
    }).filter((x) => x.title && x.url);
    return items;
  } catch { return []; }
}
