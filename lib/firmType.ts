// Classify a patent assignee as a company vs. a university/research/government
// body, from its name. Heuristic but reliable for the common cases; academic and
// government markers win over the corporate suffix (e.g. "Broad Institute, Inc."
// is academic, "Caribou Biosciences, Inc." is a company).

export type FirmType = "company" | "academic";

const ACADEMIC = /(univers|college|\binstitut|\bschool\b|hospital|clinic|foundation|fundaci|regents|trustees|board of|fellows of|academ|research council|research center|research centre|medical center|centre national|cnrs|max[ -]planck|helmholtz|fraunhofer|polytechnic|\becole\b|scuola|politecnic)/i;
const GOV = /(united states of america|u\.?s\.? department|department of|ministry|national institutes of health|\bnih\b|governholmes|the secretary|\barmy\b|\bnavy\b|air force|defense|\bnasa\b|veterans|state of |national research|national science)/i;
const COMPANY = /(\binc\b|incorporated|\bcorp\b|corporation|\bllc\b|l\.l\.c|\bltd\b|limited|gmbh|\bco\b|\bcompany\b|\bag\b|\bs\.?a\.?\b|\bplc\b|\bn\.?v\.?\b|\boy\b|\bab\b|pharm|biosci|therapeut|technolog|laborator|\blabs\b|systems|holding|ventures|\bsarl\b|s\.r\.l|\bpty\b|\bk\.?k\b|group|industries|solutions|electronics|motor|aerospace|medical inc)/i;

export function classifyFirm(name: string): FirmType {
  const n = (name || "").toLowerCase();
  if (GOV.test(n)) return "academic";
  if (ACADEMIC.test(n)) return "academic";
  if (COMPANY.test(n)) return "company";
  // No org markers (often an individual inventor) → treat as non-company.
  return "academic";
}

export const FIRM_TYPE_META: Record<FirmType, { label: string; color: string }> = {
  company: { label: "Company", color: "#C06A47" },
  academic: { label: "University / research", color: "#3B7FB5" },
};
