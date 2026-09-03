// What a person actually made, as opposed to which exercise they ran.
//
// A report page names the artifact — "Floor Leader, Amplified by Data", the
// paper's own title, the workflow you picked. Everywhere that points AT a
// report named the exercise instead, so a library read like a list of homework
// submitted rather than a shelf of things made.
//
// The workspace canvas holds the name under a handful of shapes depending on
// which room built it; this is the one place that knows them.

const CANDIDATES: ((c: any) => unknown)[] = [
  (c) => c?.plan?.headline,      // job redesign
  (c) => c?.xray?.headline,      // career / JD x-ray
  (c) => c?.report?.headline,    // consult, superpower, vision, resume, myopia, earnings…
  (c) => c?.study?.title,        // paper study
  (c) => c?.title,               // the deep-tech and research reads
  (c) => c?.subject,             // strategy canvases — the thing being analysed
  (c) => c?.brief?.headline,     // domain / licensing briefs
  (c) => c?.verdict?.headline,   // board
];

/**
 * The artifact's own name, or null when the room hasn't produced one yet.
 * Never throws and never returns an empty string — callers fall back to the
 * module name.
 */
export function artifactTitle(canvas: any): string | null {
  if (!canvas || typeof canvas !== "object") return null;
  for (const pick of CANDIDATES) {
    let v: unknown;
    try { v = pick(canvas); } catch { continue; }
    if (typeof v !== "string") continue;
    const s = v.trim();
    // Long enough to be a name, short enough to be one. A model that ignored
    // its instruction and wrote a paragraph shouldn't retitle the card.
    if (s.length >= 3 && s.length <= 90) return s;
  }
  return null;
}
