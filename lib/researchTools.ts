// The Scientifiq research-intelligence tools that live as standalone pages
// (not catalog modules), surfaced on deep-tech org landing pages and dashboards.

// If an org grants any of these deep-tech modules, it's a "deep-tech org" and the
// research-intelligence tools are shown alongside its library.
export const SCITOOLS = new Set<string>([
  "domain-brief", "score-my-invention", "find-collaborators", "licensing-brief",
  "diligence-the-science", "defense-impact", "rank-disclosures", "find-a-cofounder",
  "technology-landscape", "deep-tech-deal-sourcing", "commercialization-scorecard",
  "field-trajectory", "position-my-research", "deeptech-canvas",
]);

export type ResearchTool = { emoji: string; name: string; href: string; desc: string; note?: string; staffOnly?: boolean };

export const RESEARCH_TOOLS: ResearchTool[] = [
  { emoji: "🧭", name: "Research Agent", href: "/agent",
    desc: "Ask in plain language — find collaborators, score an idea's potential, or map where a field is heading. Grounded in real data, never made up." },
  { emoji: "🕸️", name: "Ecosystem Explorer", href: "/start/domain-brief",
    desc: "Map a field's collaboration network — the experts, the structural-hole bridges to build, and where potential concentrates.", note: "Inside Domain Brief" },
  { emoji: "📊", name: "Batch scorer", href: "/batch",
    desc: "Upload a portfolio of abstracts and get every paper's six-dimensional impact fingerprint at once, downloadable as CSV.", note: "Directors", staffOnly: true },
  { emoji: "🛰️", name: "Defense Impact", href: "/start/defense-impact",
    desc: "Estimate a paper's defense / national-security relevance, grounded in the defense-assigned patents that already cite it.", note: "Directors", staffOnly: true },
];
