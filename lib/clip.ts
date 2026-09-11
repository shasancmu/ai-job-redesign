// Truncate prose at a WORD boundary so a cutoff never chops mid-word
// ("…in the intellectual life" must not become "…in the inte…"). Cuts at the last
// space before `max`, strips any trailing punctuation, and appends an ellipsis.
// For single labels where a mid-word cut is fine (names, chart axes), a plain
// slice is still okay — this is for sentences a reader will actually read.
export function clip(text: string, max: number): string {
  const s = (text || "").trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > max * 0.5 ? cut.slice(0, lastSpace) : cut;
  return base.replace(/[\s,;:.!?—–-]+$/, "") + "…";
}
