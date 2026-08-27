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

// Equirectangular projection to a 0..1 box, for the dependency-free dot map.
export function project(lat: number, lng: number) {
  return { x: (lng + 180) / 360, y: (90 - lat) / 180 };
}

// CSV-safe cell.
export function csvCell(v: any): string {
  const s = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
