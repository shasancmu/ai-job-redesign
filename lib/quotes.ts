// A small, curated set for the presence panel — chosen to fit a research / strategy /
// learning audience: substantive, a little wry, never a motivational poster. Reliable
// (no external API), quality-controlled, and rotated. The first is on the nose for us.
export type Quote = { text: string; author: string };

export const QUOTES: Quote[] = [
  { text: "The whole is greater than the sum of its parts.", author: "Aristotle" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "Somewhere, something incredible is waiting to be known.", author: "Carl Sagan" },
  { text: "What you get by achieving your goals is not as important as what you become by achieving them.", author: "Zig Ziglar" },
  { text: "The best way to predict the future is to create it.", author: "Peter Drucker" },
  { text: "If I have seen further, it is by standing on the shoulders of giants.", author: "Isaac Newton" },
  { text: "The important thing is not to stop questioning.", author: "Albert Einstein" },
  { text: "Wonder is the beginning of wisdom.", author: "Socrates" },
  { text: "Learning never exhausts the mind.", author: "Leonardo da Vinci" },
  { text: "Chance favors the prepared mind.", author: "Louis Pasteur" },
  { text: "The people who are crazy enough to think they can change the world are the ones who do.", author: "Steve Jobs" },
  { text: "Twenty years from now you will be more disappointed by the things you didn't do than by the ones you did.", author: "Mark Twain" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "We cannot solve our problems with the same thinking we used when we created them.", author: "Albert Einstein" },
  { text: "Whatever you can do, or dream you can, begin it. Boldness has genius, power, and magic in it.", author: "Goethe" },
  { text: "Do not go where the path may lead, go instead where there is no path and leave a trail.", author: "Ralph Waldo Emerson" },
  { text: "Great things are done by a series of small things brought together.", author: "Vincent van Gogh" },
  { text: "The mind is not a vessel to be filled, but a fire to be kindled.", author: "Plutarch" },
  { text: "Try not to become a person of success, but rather try to become a person of value.", author: "Albert Einstein" },
];

export function pickQuote(): Quote {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)] ?? QUOTES[0];
}

// Live variety from a free API (ZenQuotes — no key), with the curated set as a
// guaranteed fallback on any failure, timeout, rate-limit, or junk. Server-only.
export async function fetchQuote(): Promise<Quote> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 6000);
  try {
    const res = await fetch("https://zenquotes.io/api/random", { signal: ctl.signal, cache: "no-store" });
    if (!res.ok) return pickQuote();
    const j = await res.json();
    const row = Array.isArray(j) ? j[0] : null;
    const text = String(row?.q || "").trim();
    const author = String(row?.a || "").trim();
    // ZenQuotes returns its rate-limit notice as a fake "quote"; reject that and outliers.
    if (text.length >= 12 && text.length <= 220 && author && !/zenquotes\.io|too many requests/i.test(text + " " + author)) {
      return { text, author };
    }
    return pickQuote();
  } catch {
    return pickQuote();
  } finally {
    clearTimeout(timer);
  }
}
