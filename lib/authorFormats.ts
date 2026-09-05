// The authorable module formats — the single source of truth for "what you can
// author your own in." Add a format here (and its editor in AutoBuild) and every
// count that references it updates automatically. Server-safe (no client imports),
// so marketing pages can read the count.
export type AuthorFormat = { id: string; label: string; emoji: string; endpoint: string; table?: string; editBase: string };

export const AUTHOR_FORMATS: AuthorFormat[] = [
  { id: "explainer", label: "Explainer", emoji: "📖", endpoint: "/api/mechanics/explainer-copilot", table: "explainer_specs", editBase: "/studio/explainer/" },
  { id: "roleplay", label: "Role-play", emoji: "🎭", endpoint: "/api/mechanics/copilot", table: "module_specs", editBase: "/studio/roleplay/" },
  { id: "interview", label: "Guided interview", emoji: "🗂️", endpoint: "/api/mechanics/interview-copilot", editBase: "/build/" },
  { id: "negotiation", label: "Negotiation", emoji: "🤝", endpoint: "/api/mechanics/negotiation-copilot", table: "negotiation_specs", editBase: "/studio/negotiation/" },
  { id: "benchmark", label: "Timed quiz", emoji: "⏱️", endpoint: "/api/mechanics/benchmark-copilot", table: "benchmark_specs", editBase: "/studio/benchmark/" },
  { id: "analytical", label: "Analytical instrument", emoji: "📊", endpoint: "/api/mechanics/analytical-copilot", table: "analytical_specs", editBase: "/studio/analytical/" },
  { id: "redesign", label: "Paired redesign", emoji: "🤝", endpoint: "/api/mechanics/redesign-copilot", table: "redesign_specs", editBase: "/studio/redesign/" },
  { id: "newsframe", label: "In the News", emoji: "🗞️", endpoint: "/api/mechanics/newsframe-copilot", table: "newsframe_specs", editBase: "/studio/news/" },
  { id: "case", label: "Living Case", emoji: "🎬", endpoint: "/api/mechanics/case-copilot", editBase: "/cases/" },
];

export const AUTHOR_FORMAT_COUNT = AUTHOR_FORMATS.length;
