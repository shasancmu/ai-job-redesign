// Fetch one current/trending item for a topic via Google News RSS (free, no key).
// Server-only. Returns null on any failure so the caller degrades gracefully.

function decodeXml(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim();
}

export type Trending = { title: string; url: string; source?: string };

export async function fetchTrending(query: string): Promise<Trending | null> {
  const q = (query || "").trim();
  if (q.length < 2) return null;
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q.slice(0, 120))}&hl=en-US&gl=US&ceid=US:en`;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  try {
    const res = await fetch(url, { signal: ctl.signal, cache: "no-store", headers: { "user-agent": "Mozilla/5.0" } });
    if (!res.ok) return null;
    const xml = await res.text();
    const block = xml.match(/<item>([\s\S]*?)<\/item>/)?.[1];
    if (!block) return null;
    let title = decodeXml(block.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "");
    const link = (block.match(/<link>([\s\S]*?)<\/link>/)?.[1] || "").trim();
    const source = block.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1];
    const src = source ? decodeXml(source) : undefined;
    // Google News appends " - Source" to titles; drop it when we have the source tag.
    if (src && title.endsWith(` - ${src}`)) title = title.slice(0, -(src.length + 3));
    if (!title || !link) return null;
    return { title: title.slice(0, 220), url: link, source: src?.slice(0, 80) };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
