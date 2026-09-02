import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import HeaderNav from "@/components/HeaderNav";
import Logo from "@/components/Logo";
import { facilitatorAccess } from "@/lib/orgs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AREAS = ["operations", "monitoring", "targets", "people"];

export const metadata = { title: "Census firm" };

export default async function FirmHistory({ params }: { params: { code: string; firmId: string } }) {
  const code = String(params.code || "").toUpperCase();
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const acc = await facilitatorAccess(user);
  if (!(acc.superadmin || acc.orgIds.length > 0)) redirect("/dashboard");

  const admin = createAdminClient();
  const { data: rows } = await admin.from("businesses").select("*").eq("firm_id", params.firmId).order("wave");
  const waves = rows || [];
  if (!waves.length) redirect(`/facilitator/census/${code}`);
  // Directors see only their own collections.
  if (!acc.superadmin) {
    const cc = (waves[0] as any).campaign_code;
    const { data: camp } = await admin.from("business_campaigns").select("owner_id").eq("code", cc).maybeSingle();
    if (!camp || camp.owner_id !== user.id) redirect("/data-collection");
  }
  const latest: any = waves[waves.length - 1];
  const maxWms = 5;

  // Sign the private photo paths for viewing (admin only).
  const paths = (waves as any[]).flatMap((w) => (w.photos || []).map((p: any) => p.path).filter(Boolean));
  const signed: Record<string, string> = {};
  if (paths.length) {
    try {
      const { data } = await admin.storage.from("business-photos").createSignedUrls(paths, 3600);
      for (const s of data || []) if ((s as any).signedUrl && (s as any).path) signed[(s as any).path] = (s as any).signedUrl;
    } catch { /* storage not set up yet */ }
  }
  const photoSrc = (p: any) => (p.path && signed[p.path]) || p.url || "";

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-2"><Link href={`/facilitator/census/${code}`} className="text-sm text-slate2 hover:text-ink">← Directory</Link><HeaderNav /></div>
      </header>

      <h1 className="text-3xl text-ink">{latest.name || "Business"}</h1>
      <p className="mt-1 text-slate2">{latest.isic_label || latest.naics_label || ""}{latest.locality ? ` · ${latest.locality}` : ""}{latest.country ? `, ${latest.country}` : ""} · {waves.length} wave{waves.length === 1 ? "" : "s"}</p>

      {/* Management over time */}
      <div className="mt-6 card p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Management score over time</div>
        <div className="mt-4 flex items-end gap-4">
          {waves.map((w: any, i: number) => {
            const v = Number(w.wms_overall) || 0;
            return (
              <div key={i} className="flex flex-1 flex-col items-center">
                <div className="text-sm font-bold text-ink tabular-nums">{v || "—"}</div>
                <div className="mt-1 flex h-32 w-8 items-end rounded bg-slate-100"><div className="w-full rounded bg-sage" style={{ height: `${(v / maxWms) * 100}%` }} /></div>
                <div className="mt-1 text-[10px] text-slate-400">Wave {w.wave || i + 1}</div>
                <div className="text-[10px] text-slate-400">{String(w.created_at).slice(0, 10)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Wave detail table */}
      <div className="mt-6 card overflow-x-auto p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Wave by wave</div>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400">
              <th className="py-1 pr-3">Wave</th><th className="py-1 pr-3">Date</th><th className="py-1 pr-3">Size</th><th className="py-1 pr-3">Mgmt</th>
              {AREAS.map((a) => <th key={a} className="py-1 pr-3 capitalize">{a}</th>)}
            </tr>
          </thead>
          <tbody>
            {waves.map((w: any, i: number) => {
              const byArea = (w.wms?.byArea) || {};
              return (
                <tr key={i} className="border-t border-line/60">
                  <td className="py-1.5 pr-3 font-semibold text-ink">{w.wave || i + 1}</td>
                  <td className="py-1.5 pr-3 text-slate-500">{String(w.created_at).slice(0, 10)}</td>
                  <td className="py-1.5 pr-3 text-slate-500">{w.employees_band || "—"}</td>
                  <td className="py-1.5 pr-3 font-semibold tabular-nums text-ink">{w.wms_overall || "—"}</td>
                  {AREAS.map((a) => <td key={a} className="py-1.5 pr-3 tabular-nums text-slate-600">{byArea[a] ?? "—"}</td>)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Photos over time */}
      {waves.some((w: any) => (w.photos || []).some((p: any) => photoSrc(p))) && (
        <div className="mt-6 card p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Photos over time</div>
          <div className="mt-3 space-y-4">
            {waves.map((w: any, i: number) => {
              const ph = (w.photos || []).map((p: any) => ({ ...p, src: photoSrc(p) })).filter((p: any) => p.src);
              if (!ph.length) return null;
              return (
                <div key={i}>
                  <div className="text-[11px] font-semibold text-slate-500">Wave {w.wave || i + 1} · {String(w.created_at).slice(0, 10)}</div>
                  <div className="mt-1.5 flex gap-2 overflow-x-auto pb-1">
                    {ph.map((p: any, j: number) => (
                      <a key={j} href={p.src} target="_blank" rel="noreferrer" className="shrink-0" title={p.description || p.shot}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.src} alt={p.shot} className="h-24 w-24 rounded-lg border border-line object-cover" />
                        <div className="mt-0.5 w-24 truncate text-center text-[10px] capitalize text-slate-400">{p.shot}</div>
                      </a>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {latest.report?.headline && (
        <div className="mt-6 card p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Latest read</div>
          <p className="mt-1 text-sm text-slate-700">{latest.report.headline}</p>
        </div>
      )}
    </main>
  );
}
