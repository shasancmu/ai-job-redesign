// The four landscape-scan variants. This lives OUTSIDE the "use client"
// DomainScanRoom on purpose: the server room page imports SCAN_VARIANTS to pick a
// variant by exercise, and non-component exports of a client module are opaque
// client references on the server — indexing one (SCAN_VARIANTS[exercise]) throws
// an RSC "React Client Manifest" error. A plain module is safe on both sides.

export type ScanVariant = {
  mode: "landscape" | "deal-sourcing" | "scorecard" | "trajectory";
  title: string;
  blurb: string;
  inputLabel: string;
  placeholder: string;
  needsOrg?: boolean; // scorecard scopes to one institution
};

export const SCAN_VARIANTS: Record<string, ScanVariant> = {
  "tech-landscape": { mode: "landscape", title: "Technology Landscape Scan", blurb: "Name a technology or field and see who leads it, who's commercializing it, and where the white space is.", inputLabel: "Technology or field", placeholder: "e.g. solid-state batteries" },
  "deal-sourcing": { mode: "deal-sourcing", title: "Deep-Tech Deal Sourcing", blurb: "Name your thesis and surface labs whose science is high-quality and commercializing, spin-out candidates before they raise.", inputLabel: "Your thesis or field", placeholder: "e.g. gene therapy delivery vectors" },
  "commercialization-scorecard": { mode: "scorecard", title: "University Commercialization Scorecard", blurb: "Pick an institution and a field to score how commercially oriented its research is, its strengths, and its gaps.", inputLabel: "Field to score", placeholder: "e.g. microbiome therapeutics", needsOrg: true },
  "field-trajectory": { mode: "trajectory", title: "Where Is My Field Going?", blurb: "Name a field and see which subfields are rising, where value is concentrating, and what to bet on.", inputLabel: "Field", placeholder: "e.g. computational materials discovery" },
};
