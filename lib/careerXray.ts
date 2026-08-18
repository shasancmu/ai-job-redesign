// ============================================================================
// "Career X-ray" — a research-grounded exposure analysis of a person's job.
// Decompose the role into tasks (Autor), score each task's AI exposure using
// the Eloundou et al. rubric (E0/E1/E2), benchmark bottom-up (their tasks) vs
// top-down (the occupation), and — crucially — GENERATE new complementary tasks
// (Acemoglu & Restrepo), not just subtract. Framing: exposure ≠ replacement.
// ============================================================================

export const EXPOSURE_META: Record<string, { label: string; color: string; blurb: string }> = {
  E0: { label: "E0 · No exposure", color: "#3F7A52", blurb: "AI barely helps. Human owns it." },
  E1: { label: "E1 · Direct", color: "#CE8F2C", blurb: "An LLM alone cuts the time a lot." },
  E2: { label: "E2 · With tools", color: "#B4532E", blurb: "LLM + software/tools does most of it." },
};

export const MODE_META: Record<string, { label: string; color: string }> = {
  substitute: { label: "AI substitutes", color: "#B4532E" },
  complement: { label: "AI complements you", color: "#3F7A52" },
};

// The research the analysis stands on — shown in a citations panel so the
// exercise reads as a method, not a gimmick.
export const CITATIONS: { authors: string; work: string; used: string }[] = [
  { authors: "Autor (2013)", work: "The task approach to labor markets", used: "Jobs are bundles of tasks. AI hits tasks, not job titles." },
  { authors: "Eloundou, Manning, Mishkin & Rock (2023)", work: "GPTs are GPTs", used: "The E0/E1/E2 exposure rubric scoring each task." },
  { authors: "Brynjolfsson, Mitchell & Rock", work: "Suitability for Machine Learning (SML)", used: "The top-down, occupation-level benchmark." },
  { authors: "Acemoglu & Restrepo (2019)", work: "Automation and New Tasks", used: "Why redesign should create new work, not only subtract it." },
];

export const CAREER_STEPS = [
  { key: "input", title: "Your role", minutes: 4 },
  { key: "xray", title: "Your X-ray", minutes: 10 },
];

export function hasXray(x: any) {
  return x && (x.summary || x.headline || (x.tasks?.length || 0) > 0);
}
