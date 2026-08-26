import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import HeaderNav from "@/components/HeaderNav";
import Logo from "@/components/Logo";
import { isAdmin } from "@/lib/admin";
import { LEVERS, tally } from "@/lib/capstone";
import CapstoneCohortSynthesis from "@/components/CapstoneCohortSynthesis";

export const dynamic = "force-dynamic";

const VERDICT_LABEL: Record<string, string> = { clean: "Clean", suspected: "Suspected", caught: "Caught", "not graded": "Not graded" };

export default async function CapstoneResults({ searchParams }: { searchParams: { cohort?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.email)) redirect("/dashboard");

  const admin = createAdminClient();
  const cohort = (searchParams.cohort || "").toUpperCase();

  // No cohort chosen: list the cohorts that have capstone runs.
  if (!cohort) {
    const { data: all } = await admin.from("capstone_sessions").select("cohort").not("cohort", "is", null).limit(1000);
    const counts = new Map<string, number>();
    for (const s of all || []) counts.set((s as any).cohort, (counts.get((s as any).cohort) || 0) + 1);
    const rows = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    return (
      <Shell>
        <h1 className="text-3xl text-ink">The Number: team results</h1>
        <p className="mt-1 text-slate2">Pick a cohort to see every team's plan, outcome, and the cross-team synthesis.</p>
        <div className="mt-6 space-y-2">
          {rows.length === 0 && <p className="text-sm text-slate-400">No team runs yet. Once a cohort runs The Number, they show up here.</p>}
          {rows.map(([c, n]) => (
            <Link key={c} href={`/facilitator/capstone?cohort=${encodeURIComponent(c)}`} className="flex items-center justify-between rounded-xl border border-line bg-white p-3 hover:shadow-lift">
              <span className="font-mono font-bold tracking-widest text-ink">{c}</span>
              <span className="text-sm text-slate-500">{n} team{n === 1 ? "" : "s"} →</span>
            </Link>
          ))}
        </div>
      </Shell>
    );
  }

  // Load every team in the cohort.
  const { data: sessions } = await admin.from("capstone_sessions").select("id, code, phase, status, report").eq("cohort", cohort).order("created_at");
  const teams = [] as any[];
  for (const s of sessions || []) {
    const [{ data: picks }, { data: members }] = await Promise.all([
      admin.from("capstone_picks").select("lever_key, selected").eq("session_id", s.id),
      admin.from("capstone_members").select("name, role").eq("session_id", s.id).order("created_at"),
    ]);
    const keys = (picks || []).filter((p: any) => p.selected).map((p: any) => p.lever_key);
    const t = tally(keys);
    teams.push({
      code: s.code,
      phase: s.phase,
      graded: !!(s.report),
      report: s.report as any,
      members: members || [],
      keys,
      t,
    });
  }

  const graded = teams.filter((tm) => tm.graded);
  const hit = teams.filter((tm) => tm.t.hitsTarget).length;
  const indicted = teams.filter((tm) => tm.t.indicted).length;
  const verdictCounts = graded.reduce((acc: Record<string, number>, tm) => { const v = tm.report?.market_verdict || "not graded"; acc[v] = (acc[v] || 0) + 1; return acc; }, {});

  // Lever popularity across teams.
  const leverCount = new Map<string, number>();
  for (const tm of teams) for (const k of tm.keys) leverCount.set(k, (leverCount.get(k) || 0) + 1);
  const popular = LEVERS.map((l) => ({ l, n: leverCount.get(l.key) || 0 })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n);
  const maxN = popular[0]?.n || 1;

  return (
    <Shell>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl text-ink">The Number: {cohort}</h1>
          <p className="mt-1 text-slate2">{teams.length} team{teams.length === 1 ? "" : "s"} · {graded.length} graded</p>
        </div>
        <Link href="/facilitator/capstone" className="btn-ghost text-sm">All cohorts</Link>
      </div>

      {/* Summary */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Teams" value={`${teams.length}`} />
        <Stat label="Hit the number" value={`${hit}/${teams.length}`} color="#3F7A52" />
        <Stat label="Indicted" value={`${indicted}`} color={indicted ? "#B4532E" : "#14283A"} />
        <Stat label="Caught by market" value={`${verdictCounts.caught || 0}`} color={verdictCounts.caught ? "#B4532E" : "#14283A"} />
      </div>

      {/* Cross-team synthesis */}
      <div className="mt-6">
        <CapstoneCohortSynthesis cohort={cohort} teamCount={teams.length} />
      </div>

      {/* Lever popularity */}
      <div className="mt-6 card p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Which levers teams reached for</div>
        <div className="mt-3 space-y-1.5">
          {popular.map(({ l, n }) => (
            <div key={l.key} className="flex items-center gap-3 text-sm">
              <div className="w-56 shrink-0 truncate text-slate-700" title={l.label}>{l.label}{!l.legal && <span className="ml-1 text-[10px] font-bold text-clay">FRAUD</span>}</div>
              <div className="h-3 flex-1 rounded-full bg-slate-100">
                <div className="h-3 rounded-full" style={{ width: `${(n / maxN) * 100}%`, background: l.legal ? "#3F7A52" : "#B4532E" }} />
              </div>
              <div className="w-8 shrink-0 text-right tabular-nums text-slate-500">{n}</div>
            </div>
          ))}
          {!popular.length && <p className="text-sm text-slate-400">No levers chosen yet.</p>}
        </div>
      </div>

      {/* Per-team */}
      <div className="mt-6 card p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Team by team</div>
        <div className="mt-3 space-y-2">
          {teams.map((tm) => (
            <div key={tm.code} className="rounded-xl border border-line p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-ink">{tm.code}</span>
                  <span className="text-xs text-slate-400">{tm.members.map((m: any) => m.name).filter(Boolean).join(", ") || "no members"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {tm.t.indicted && <span className="rounded-full bg-clay px-2 py-0.5 text-[11px] font-semibold text-white">Indicted</span>}
                  <span className={"rounded-full px-2 py-0.5 text-[11px] font-semibold " + (tm.t.hitsTarget ? "bg-sage text-white" : "bg-slate-200 text-slate-600")}>{tm.t.hitsTarget ? "Hit" : "Missed"}</span>
                  {tm.graded && <span className="rounded-full bg-mist px-2 py-0.5 text-[11px] font-semibold text-slate-600">{VERDICT_LABEL[tm.report?.market_verdict] || "graded"}</span>}
                </div>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                <span>{tm.t.cents.toFixed(1)}c assembled</span>
                <span>detection {tm.t.detection}</span>
                <span>~${tm.t.valueDestroyed}M destroyed</span>
                <span className="truncate">levers: {tm.t.picked.map((l: any) => l.label).slice(0, 3).join("; ") || "none"}{tm.t.picked.length > 3 ? ` +${tm.t.picked.length - 3}` : ""}</span>
              </div>
            </div>
          ))}
          {!teams.length && <p className="text-sm text-slate-400">No teams in this cohort yet.</p>}
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-2">
          <Link href="/facilitator" className="text-sm text-slate2 hover:text-ink">← Cohorts</Link>
          <HeaderNav />
        </div>
      </header>
      {children}
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
