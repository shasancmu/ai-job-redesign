import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";
import { csvCell } from "@/lib/census";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLS = ["id", "firm_id", "firm_code", "wave", "created_at", "campaign_code", "name", "address", "lat", "lng", "geo_source", "gps_accuracy", "country", "admin1", "locality", "naics", "naics_label", "isic", "isic_label", "classify_conf", "employees_band", "revenue_band", "founded_year", "multi_site", "customer_type", "ownership", "wms_overall", "mode"];

// INSTRUCTOR/RESEARCHER: export a campaign's firm-wave records as CSV.
export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) return new Response("Not allowed", { status: 403 });

  const url = new URL(request.url);
  const code = (url.searchParams.get("campaign") || "").toUpperCase();

  const admin = createAdminClient();
  const q = admin.from("businesses").select("*").order("created_at", { ascending: false }).limit(5000);
  const { data: rows } = await (code ? q.eq("campaign_code", code) : q);

  const wmsAreas = ["operations", "monitoring", "targets", "people"];
  const header = [...COLS, ...wmsAreas.map((a) => `wms_${a}`)];
  const lines = [header.join(",")];
  for (const r of rows || []) {
    const byArea = ((r as any).wms?.byArea) || {};
    const base = COLS.map((c) => csvCell((r as any)[c]));
    const wms = wmsAreas.map((a) => csvCell(byArea[a] ?? ""));
    lines.push([...base, ...wms].join(","));
  }
  const csv = lines.join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="business-census-${code || "all"}.csv"`,
    },
  });
}
