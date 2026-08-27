import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import HeaderNav from "@/components/HeaderNav";
import Logo from "@/components/Logo";
import { isAdmin } from "@/lib/admin";
import { project } from "@/lib/census";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function CensusDashboard({ params }: { params: { code: string } }) {
  const code = String(params.code || "").toUpperCase();
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.email)) redirect("/dashboard");

  const admin = createAdminClient();
  const { data: campaign } = await admin.from("business_campaigns").select("label").eq("code", code).maybeSingle();
  const { data: rows } = await admin.from("businesses").select("name, lat, lng, country, locality, naics, naics_label, employees_band, wms_overall, customer_type").eq("campaign_code", code).limit(5000);
  const biz = rows || [];

  const h = headers();
  const host = (h.get("host") || "superadditive.app").replace(/^www\./, "");
  const joinUrl = `https://${host}/census/${code}`;

  const withGeo = biz.filter((b: any) => typeof b.lat === "number" && typeof b.lng === "number");
  const wmsVals = biz.map((b: any) => Number(b.wms_overall)).filter((v: number) => v > 0);
  const wmsAvg = wmsVals.length ? Math.round((wmsVals.reduce((a: number, b: number) => a + b, 0) / wmsVals.length) * 100) / 100 : null;

  const tally = (key: string, label?: (v: any) => string) => {
    const m = new Map<string, number>();
    for (const b of biz as any[]) { const raw = b[key]; if (!raw) continue; const k = label ? label(raw) : String(raw); m.set(k, (m.get(k) || 0) + 1); }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const sectors = tally("naics", (v) => String(v).slice(0, 2));
  const sizes = tally("employees_band");
  const countries = tally("country");
  const maxSector = sectors[0]?.[1] || 1;
  const maxSize = sizes[0]?.[1] || 1;

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-2"><Link href="/facilitator/census" className="text-sm text-slate2 hover:text-ink">← Collections</Link><HeaderNav /></div>
      </header>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl text-ink">Business census: {code}</h1>
          {campaign?.label && <p className="mt-1 text-slate2">{campaign.label}</p>}
        </div>
        <a href={`/api/census/export?campaign=${code}`} className="btn-primary text-sm">Export CSV</a>
      </div>

      <div className="mt-3 rounded-xl bg-mist px-4 py-3 text-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Share this link to collect profiles</div>
        <div className="mt-0.5 font-mono text-ink">{joinUrl}</div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Businesses" value={`${biz.length}`} />
        <Stat label="Geocoded" value={`${withGeo.length}`} />
        <Stat label="Avg management" value={wmsAvg !== null ? `${wmsAvg}` : "—"} color={wmsAvg && wmsAvg >= 3.5 ? "#3F7A52" : wmsAvg && wmsAvg < 2.5 ? "#B4532E" : "#CE8F2C"} />
        <Stat label="Countries" value={`${countries.length}`} />
      </div>

      {/* Map */}
      <div className="mt-6 card p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Where they are ({withGeo.length} located)</div>
        <div className="mt-3 overflow-hidden rounded-xl border border-line bg-sky-soft/40">
          <svg viewBox="0 0 360 180" className="h-auto w-full" preserveAspectRatio="xMidYMid meet">
            {[...Array(5)].map((_, i) => <line key={`h${i}`} x1={0} y1={(i + 1) * 30} x2={360} y2={(i + 1) * 30} stroke="#00000010" strokeWidth={0.5} />)}
            {[...Array(11)].map((_, i) => <line key={`v${i}`} x1={(i + 1) * 30} y1={0} x2={(i + 1) * 30} y2={180} stroke="#00000010" strokeWidth={0.5} />)}
            {withGeo.map((b: any, i: number) => { const p = project(b.lat, b.lng); return <circle key={i} cx={p.x * 360} cy={p.y * 180} r={2.2} fill="#3F7A52" fillOpacity={0.75} />; })}
          </svg>
        </div>
        <p className="mt-2 text-[11px] text-slate-400">Equirectangular scatter of geocoded businesses. A full tile map is next.</p>
      </div>

      {/* Distributions */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Top industries (NAICS 2-digit)</div>
          <div className="mt-3 space-y-1.5">
            {sectors.slice(0, 8).map(([s, n]) => (
              <div key={s} className="flex items-center gap-2 text-sm"><span className="w-10 shrink-0 font-mono text-slate-500">{s}</span><div className="h-3 flex-1 rounded-full bg-slate-100"><div className="h-3 rounded-full bg-sage" style={{ width: `${(n / maxSector) * 100}%` }} /></div><span className="w-6 text-right text-slate-500">{n}</span></div>
            ))}
            {!sectors.length && <p className="text-sm text-slate-400">No data yet.</p>}
          </div>
        </div>
        <div className="card p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Size (employees)</div>
          <div className="mt-3 space-y-1.5">
            {sizes.map(([s, n]) => (
              <div key={s} className="flex items-center gap-2 text-sm"><span className="w-16 shrink-0 truncate text-slate-500" title={s}>{s}</span><div className="h-3 flex-1 rounded-full bg-slate-100"><div className="h-3 rounded-full bg-ink" style={{ width: `${(n / maxSize) * 100}%` }} /></div><span className="w-6 text-right text-slate-500">{n}</span></div>
            ))}
            {!sizes.length && <p className="text-sm text-slate-400">No data yet.</p>}
          </div>
        </div>
      </div>

      {/* Recent records */}
      <div className="mt-6 card p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Records</div>
        <div className="mt-3 space-y-1.5">
          {biz.slice(0, 40).map((b: any, i: number) => (
            <div key={i} className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-1.5 text-sm">
              <span className="font-medium text-ink">{b.name || "Unnamed"}</span>
              <span className="text-xs text-slate-400">{b.naics_label || ""}{b.locality ? ` · ${b.locality}` : ""}{b.wms_overall ? ` · mgmt ${b.wms_overall}` : ""}</span>
            </div>
          ))}
          {!biz.length && <p className="text-sm text-slate-400">No profiles yet. Share the link above.</p>}
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl bg-mist p-3 text-center">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-0.5 text-xl font-bold tabular-nums" style={{ color: color || "#14283A" }}>{value}</div>
    </div>
  );
}
