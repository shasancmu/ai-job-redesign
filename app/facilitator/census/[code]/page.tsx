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
  const { data: rows } = await admin.from("businesses")
    .select("id, firm_id, wave, created_at, name, lat, lng, country, locality, naics, naics_label, isic_label, employees_band, wms_overall, customer_type")
    .eq("campaign_code", code).order("wave").limit(8000);
  const all = rows || [];

  // Group into firms (waves of the same business). Fallback to id for old rows.
  const firms = new Map<string, any[]>();
  for (const b of all as any[]) { const k = b.firm_id || b.id; if (!firms.has(k)) firms.set(k, []); firms.get(k)!.push(b); }
  const firmList = [...firms.entries()].map(([fid, waves]) => {
    const sorted = [...waves].sort((a, b) => (a.wave || 1) - (b.wave || 1));
    const first = sorted[0], latest = sorted[sorted.length - 1];
    const delta = (Number(latest.wms_overall) || 0) - (Number(first.wms_overall) || 0);
    return { fid, waves: sorted, first, latest, delta, count: sorted.length };
  }).sort((a, b) => new Date(b.latest.created_at).getTime() - new Date(a.latest.created_at).getTime());

  const latest = firmList.map((f) => f.latest);
  const h = headers();
  const host = (h.get("host") || "superadditive.app").replace(/^www\./, "");
  const joinUrl = `https://${host}/census/${code}`;

  const withGeo = latest.filter((b: any) => typeof b.lat === "number" && typeof b.lng === "number");
  const wmsVals = latest.map((b: any) => Number(b.wms_overall)).filter((v: number) => v > 0);
  const wmsAvg = wmsVals.length ? Math.round((wmsVals.reduce((a: number, b: number) => a + b, 0) / wmsVals.length) * 100) / 100 : null;

  const tally = (arr: any[], key: string, label?: (v: any) => string) => {
    const m = new Map<string, number>();
    for (const b of arr) { const raw = b[key]; if (!raw) continue; const k = label ? label(raw) : String(raw); m.set(k, (m.get(k) || 0) + 1); }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const sectors = tally(latest, "isic_label");
  const sizes = tally(latest, "employees_band");
  const countries = tally(latest, "country");
  const maxSector = sectors[0]?.[1] || 1;
  const maxSize = sizes[0]?.[1] || 1;
  const revisited = firmList.filter((f) => f.count > 1).length;

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-2"><Link href="/facilitator/census" className="text-sm text-slate2 hover:text-ink">← Collections</Link><HeaderNav /></div>
      </header>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl text-ink">Business directory: {code}</h1>
          {campaign?.label && <p className="mt-1 text-slate2">{campaign.label}</p>}
        </div>
        <a href={`/api/census/export?campaign=${code}`} className="btn-primary text-sm">Export CSV</a>
      </div>

      <div className="mt-3 rounded-xl bg-mist px-4 py-3 text-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Share this link to add businesses</div>
        <div className="mt-0.5 font-mono text-ink">{joinUrl}</div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Businesses" value={`${firmList.length}`} />
        <Stat label="Profiles (waves)" value={`${all.length}`} sub={revisited ? `${revisited} updated` : undefined} />
        <Stat label="Avg management" value={wmsAvg !== null ? `${wmsAvg}` : "—"} color={wmsAvg && wmsAvg >= 3.5 ? "#3F7A52" : wmsAvg && wmsAvg < 2.5 ? "#B4532E" : "#CE8F2C"} />
        <Stat label="Countries" value={`${countries.length}`} />
      </div>

      <div className="mt-6 card p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Where they are ({withGeo.length} located)</div>
        <div className="mt-3 overflow-hidden rounded-xl border border-line bg-sky-soft/40">
          <svg viewBox="0 0 360 180" className="h-auto w-full" preserveAspectRatio="xMidYMid meet">
            {[...Array(5)].map((_, i) => <line key={`h${i}`} x1={0} y1={(i + 1) * 30} x2={360} y2={(i + 1) * 30} stroke="#00000010" strokeWidth={0.5} />)}
            {[...Array(11)].map((_, i) => <line key={`v${i}`} x1={(i + 1) * 30} y1={0} x2={(i + 1) * 30} y2={180} stroke="#00000010" strokeWidth={0.5} />)}
            {withGeo.map((b: any, i: number) => { const p = project(b.lat, b.lng); return <circle key={i} cx={p.x * 360} cy={p.y * 180} r={2.2} fill="#3F7A52" fillOpacity={0.75} />; })}
          </svg>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Top industries (ISIC)</div>
          <div className="mt-3 space-y-1.5">
            {sectors.slice(0, 8).map(([s, n]) => (
              <div key={s} className="flex items-center gap-2 text-sm"><span className="w-40 shrink-0 truncate text-slate-600" title={s}>{s}</span><div className="h-3 flex-1 rounded-full bg-slate-100"><div className="h-3 rounded-full bg-sage" style={{ width: `${(n / maxSector) * 100}%` }} /></div><span className="w-6 text-right text-slate-500">{n}</span></div>
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

      {/* Firms with panel progress */}
      <div className="mt-6 card p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Businesses in the panel</div>
        <div className="mt-3 space-y-1.5">
          {firmList.slice(0, 60).map((f) => (
            <Link key={f.fid} href={`/facilitator/census/${code}/firm/${f.fid}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line/60 px-3 py-2 text-sm hover:border-slate-300">
              <span className="font-medium text-ink">{f.latest.name || "Unnamed"}</span>
              <span className="flex items-center gap-3 text-xs text-slate-400">
                <span>{f.latest.isic_label || ""}{f.latest.locality ? ` · ${f.latest.locality}` : ""}</span>
                {f.count > 1 && <span className="rounded-full bg-mist px-2 py-0.5 font-semibold text-slate-600">{f.count} waves</span>}
                {f.latest.wms_overall ? <span className="tabular-nums">mgmt {f.latest.wms_overall}{f.count > 1 && f.delta !== 0 ? <b className={f.delta > 0 ? "text-sage" : "text-clay"}> {f.delta > 0 ? "▲" : "▼"}{Math.abs(Math.round(f.delta * 10) / 10)}</b> : ""}</span> : null}
              </span>
            </Link>
          ))}
          {!firmList.length && <p className="text-sm text-slate-400">No businesses yet. Share the link above.</p>}
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-mist p-3 text-center">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-0.5 text-xl font-bold tabular-nums" style={{ color: color || "#14283A" }}>{value}</div>
      {sub && <div className="text-[10px] text-slate-400">{sub}</div>}
    </div>
  );
}
