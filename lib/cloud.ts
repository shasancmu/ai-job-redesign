// Live Word Cloud domain helpers. A presenter poses a question; the room
// submits short phrases (no sign-in); identical phrases stack up bigger.

// Ambiguity-free alphabet (no O/0, I/1) for a code people read off a screen.
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function makeCloudCode(len = 5): string {
  let out = "";
  for (let i = 0; i < len; i++) out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return out;
}

// How long a single phrase can be. Word clouds read best when entries are short,
// so we cap hard and trim in the UI too.
export const MAX_PHRASE = 40;

// Normalize a phrase into the key used to tally identical entries: lowercase,
// trim, collapse inner whitespace, strip surrounding punctuation. "Machine
// Learning" and "machine learning." land in the same bucket.
export function normalizePhrase(raw: string): string {
  return String(raw || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "")
    .trim()
    .slice(0, MAX_PHRASE);
}

// Clean the display text (preserve the submitter's casing, just tidy spacing).
export function cleanPhrase(raw: string): string {
  return String(raw || "").replace(/\s+/g, " ").trim().slice(0, MAX_PHRASE);
}

export type CloudWord = { text: string; norm: string; count: number };

// Aggregate raw entries into a frequency-sorted word list. Display text is the
// most common original casing seen for each normalized key.
export function aggregate(entries: { text: string; norm: string }[]): CloudWord[] {
  const buckets = new Map<string, { count: number; casings: Map<string, number> }>();
  for (const e of entries) {
    const norm = e.norm || normalizePhrase(e.text);
    if (!norm) continue;
    const b = buckets.get(norm) || { count: 0, casings: new Map() };
    b.count += 1;
    const disp = cleanPhrase(e.text) || norm;
    b.casings.set(disp, (b.casings.get(disp) || 0) + 1);
    buckets.set(norm, b);
  }
  const words: CloudWord[] = [];
  for (const [norm, b] of buckets) {
    let best = norm;
    let bestN = -1;
    for (const [disp, n] of b.casings) if (n > bestN) { best = disp; bestN = n; }
    words.push({ text: best, norm, count: b.count });
  }
  // Most frequent first; ties broken alphabetically so order is stable.
  words.sort((a, b) => b.count - a.count || a.norm.localeCompare(b.norm));
  return words;
}
