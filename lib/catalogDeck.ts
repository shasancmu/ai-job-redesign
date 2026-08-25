// The module-catalog overview, generated from the registry so it never goes
// stale. One section per built-in category: its modules, what you leave with,
// the features, and the credential you can earn. Rendered through the deck
// presenter at /overview. Server-side (pure data in, Slide[] out).

import { CATEGORIES, MODULES, byCatalogOrder, moduleCategory, moduleFeatures, FEATURES, type CategoryKey, type ModuleDef } from "@/lib/modules";
import { BUNDLES } from "@/lib/credentials";
import type { Slide, DeckCard } from "@/lib/deckTypes";

// Which certificates a category leads toward (bundle keys).
const CATEGORY_BUNDLES: Record<CategoryKey, string[]> = {
  redesign: ["ai-ready", "career-navigator"],
  strategy: ["strategist", "founder"],
  commercialize: ["founder"],
  negotiate: ["negotiator"],
  live: [],
  research: ["research"],
  phd: ["phd-path"],
  foundations: ["ai-literacy"],
};

const FEATURE_LABEL: Record<string, string> = Object.fromEntries(FEATURES.map((f) => [f.key, f.label]));

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}
function short(s: string, n = 120): string { return s && s.length > n ? s.slice(0, n - 1) + "…" : s || ""; }

export function buildCatalogSlides(): Slide[] {
  const slides: Slide[] = [];
  let n = 0;
  const id = () => `cat${n++}`;

  slides.push({ id: id(), type: "title", title: "The Superadditive module library", subtitle: "Every group, what you learn, and the credential you earn." });
  slides.push({ id: id(), type: "text", body: "The library is organized into groups. Each module is a short, AI-run exercise on your own situation, grounded in a real framework. Complete a group's core modules and you earn a shareable certificate." });

  for (const cat of CATEGORIES) {
    const mods = MODULES
      .filter((m) => !m.hidden && moduleCategory(m.slug) === cat.key)
      .sort(byCatalogOrder);
    if (mods.length === 0) continue;

    // Section + blurb.
    slides.push({ id: id(), type: "section", title: cat.title });
    slides.push({ id: id(), type: "text", title: cat.title, body: cat.blurb });

    // Modules as cards, six per slide.
    for (const group of chunk(mods, 6)) {
      const cards: DeckCard[] = group.map((m) => ({ icon: m.emoji || "•", heading: m.name, text: short(m.tagline, 110) }));
      slides.push({ id: id(), type: "cards", title: `${cat.title}: the modules`, cards });
    }

    // What you get + how it runs + the credential.
    const feats = Array.from(new Set(mods.flatMap((m) => moduleFeatures(m.slug)))).map((k) => FEATURE_LABEL[k]).filter(Boolean);
    const mins = mods.map((m) => m.minutes).filter((x) => x > 0);
    const timeRange = mins.length ? (Math.min(...mins) === Math.max(...mins) ? `${Math.min(...mins)} min each` : `${Math.min(...mins)} to ${Math.max(...mins)} min each`) : "";
    const bundles = CATEGORY_BUNDLES[cat.key].map((k) => BUNDLES.find((b) => b.key === k)).filter(Boolean) as typeof BUNDLES;

    const cards: DeckCard[] = [];
    cards.push({ icon: "🎯", heading: "What you leave with", text: bundles[0]?.line || short(cat.blurb, 140) });
    cards.push({ icon: "🕒", heading: "How it runs", text: [feats.join(", "), timeRange].filter(Boolean).join(" · ") || "Self-paced" });
    if (bundles.length) {
      const b = bundles[0];
      const need = b.electivesNeeded > 0 ? `${b.core.length} core + ${b.electivesNeeded} elective${b.electivesNeeded > 1 ? "s" : ""}` : `${b.core.length} core modules`;
      cards.push({ icon: "🏅", heading: `Certificate: ${b.name}`, text: `${need}. Shareable to LinkedIn.` });
      if (bundles[1]) cards.push({ icon: "🏅", heading: `Also: ${bundles[1].name}`, text: bundles[1].line });
      if (b.skills?.length) cards.push({ icon: "🧠", heading: "Skills it shows", text: b.skills.join(", ") });
    } else {
      cards.push({ icon: "▶️", heading: "Run it live", text: "Instructor-run, whole-room diagnostics. No certificate; it's a live teaching tool." });
    }
    slides.push({ id: id(), type: "cards", title: `${cat.title}: what you get`, cards });
  }

  slides.push({ id: id(), type: "section", title: "Start anywhere" });
  slides.push({ id: id(), type: "cards", title: "How to begin", cards: [
    { icon: "▶️", heading: "Run one", text: "Pick a module from the dashboard and do it in twenty minutes." },
    { icon: "🏅", heading: "Earn a certificate", text: "Finish a group's core modules to earn a shareable credential." },
    { icon: "🖥️", heading: "Present it live", text: "Drop any live activity into a deck and run it with your room." },
  ] });

  return slides;
}
