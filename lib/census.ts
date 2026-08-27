// Business Census: a multimodal, AI-run business profile that compounds into a
// research panel. Reuses the World Management Survey from lib/business.
export { WMS, WMS_AREAS, wmsScore } from "@/lib/business";

export const EMPLOYEE_BANDS = ["1 (just me)", "2-4", "5-9", "10-19", "20-49", "50-99", "100-249", "250-999", "1000+"];
export const REVENUE_BANDS = ["Prefer not to say", "Under $100k", "$100k-$500k", "$500k-$1M", "$1M-$5M", "$5M-$25M", "$25M-$100M", "Over $100M"];
export const CUSTOMER_TYPES = [
  { key: "b2c", label: "Mostly consumers (B2C)" },
  { key: "b2b", label: "Mostly other businesses (B2B)" },
  { key: "both", label: "Both" },
];
export const OWNERSHIP_TYPES = [
  { key: "independent", label: "Independent / owner-run" },
  { key: "family", label: "Family-owned" },
  { key: "partnership", label: "Partnership" },
  { key: "pe_vc", label: "PE or VC backed" },
  { key: "public", label: "Publicly traded" },
  { key: "nonprofit", label: "Nonprofit / other" },
];

export type NetworkEdge = { name: string; tie: string; strength: number };
export const TIE_TYPES = [
  { key: "supplier", label: "Key supplier" },
  { key: "customer", label: "Biggest customer" },
  { key: "competitor", label: "Main competitor" },
  { key: "partner", label: "Partner / collaborator" },
  { key: "advisor", label: "Advisor / mentor" },
];

// A firm-wave record as submitted from the flow.
export type BusinessRecord = {
  name: string;
  address: string;
  lat?: number | null;
  lng?: number | null;
  country?: string;
  admin1?: string;
  locality?: string;
  geo_source?: string;
  industry_desc?: string;
  naics?: string;
  naics_label?: string;
  isic?: string;
  isic_label?: string;
  classify_conf?: number;
  employees_band?: string;
  revenue_band?: string;
  founded_year?: number | null;
  multi_site?: boolean;
  customer_type?: string;
  ownership?: string;
  wms?: any;
  wms_overall?: number | null;
  tech?: any;
  network?: NetworkEdge[];
  photos?: any[];
  transcript?: string;
  mode?: string;
  consent?: boolean;
  contact_email?: string;
};

// Standardized photo protocol. Three core shots are the same for every business
// (so records are comparable across firms and across waves); a fourth shot is
// chosen by business type, so each firm photographs what is actually informative.
export type Shot = { key: string; label: string; instruction: string; hint: string };

export const CORE_SHOTS: Shot[] = [
  { key: "front", label: "The front", instruction: "The outside: your storefront, sign, or entrance.", hint: "Assess visibility, signage and branding, formality, and the condition of the premises." },
  { key: "workspace", label: "Where the work happens", instruction: "Inside, where the work gets done: your floor, kitchen, workshop, or desk.", hint: "Assess how organized, clean, and well-equipped the workspace is, the tools present, and the apparent scale. This reflects operational management." },
  { key: "product", label: "What you sell or make", instruction: "Your products, your inventory, or a service being delivered.", hint: "Assess product range, quality, presentation, and how much stock is visible." },
];

// The type-specific fourth shot, from the classified industry.
export function fourthShot(input: { naics?: string; naics_label?: string; isic_label?: string; industry_desc?: string }): Shot {
  const t = `${input.naics_label || ""} ${input.isic_label || ""} ${input.industry_desc || ""}`.toLowerCase();
  const n2 = (input.naics || "").slice(0, 2);
  const is = (re: RegExp, ...codes: string[]) => re.test(t) || codes.includes(n2);
  if (is(/restaurant|cafe|café|food|bakery|catering|kitchen|eatery|bar\b/, "72")) return { key: "kitchen", label: "Your kitchen or prep area", instruction: "Where food is prepared or cooked.", hint: "Assess cleanliness, equipment, hygiene, and organization of the prep or cooking area." };
  if (is(/shop|store|retail|boutique|kiosk|market stall|grocer|pharmac/, "44", "45")) return { key: "shelves", label: "Your shelves and counter", instruction: "How your goods are stocked and displayed, and your point of sale.", hint: "Assess stock depth, how full the shelves are, merchandising, and the point of sale setup." };
  if (is(/manufactur|factory|workshop|produc|assembl|fabricat|mill\b|processing/, "31", "32", "33")) return { key: "production", label: "Your production area", instruction: "Your machinery, production line, or raw materials.", hint: "Assess equipment, capacity, work-in-progress and raw material, and how organized production is." };
  if (is(/farm|agri|crop|livestock|poultry|dairy|fish|forestry|plantation|harvest/, "11")) return { key: "field", label: "Your field, crop, or livestock", instruction: "Your land, crops, animals, or storage.", hint: "Assess the crop or livestock, land in use, storage, and apparent scale and condition." };
  if (is(/construct|builder|contractor|renovation|civil works/, "23")) return { key: "site", label: "A job site or your equipment", instruction: "A current project or your tools and equipment.", hint: "Assess the type of work, equipment, materials, and scale of the project." };
  if (is(/transport|logistic|delivery|haul|freight|courier|taxi|fleet/, "48", "49")) return { key: "fleet", label: "Your vehicles or storage", instruction: "Your vehicles, warehouse, or storage.", hint: "Assess the fleet or storage, its condition, and the apparent scale." };
  return { key: "team", label: "Your team at work", instruction: "Your team working, or the main tools of your trade.", hint: "Assess the team size, the tools and technology in use, and how the work is set up." };
}

export function shotsFor(rec: { naics?: string; naics_label?: string; isic_label?: string; industry_desc?: string }): Shot[] {
  return [...CORE_SHOTS, fourthShot(rec)];
}

// Equirectangular projection to a 0..1 box, for the dependency-free dot map.
export function project(lat: number, lng: number) {
  return { x: (lng + 180) / 360, y: (90 - lat) / 180 };
}

// CSV-safe cell.
export function csvCell(v: any): string {
  const s = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
