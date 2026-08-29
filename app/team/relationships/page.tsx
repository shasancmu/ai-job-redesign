import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roleFor, getActiveOrg } from "@/lib/orgs";
import { gatherRelationshipOS, type MemberState } from "@/lib/relationships";
import Logo from "@/components/Logo";
import HeaderNav from "@/components/HeaderNav";

export const dynamic = "force-dynamic";

const BUCKET_META: Record<string, { label: string; cls: string; dot: string }> = {
  strong: { label: "Strong", cls: "text-emerald-700", dot: "#059669" },
  cooling: { label: "Cooling", cls: "text-amber-700", dot: "#B45309" },
  at_risk: { label: "At risk", cls: "text-orange-700", dot: "#C2410C" },
  dormant: { label: "Dormant", cls: "text-slate-500", dot: "#94A3B8" },
};

function ago(d: number | null): string {
  if (d == null) return "never";
  if (d === 0) return "today";
  if (d < 30) return `${d}d ago`;
  if (d < 365) return `${Math.round(d / 30)}mo ago`;
  return `${Math.round(d / 365)}y ago`;
}

function PersonRow({ m, right }: { m: MemberState; right?: string }) {
  const b = BUCKET_META[m.bucket];
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 text-sm">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: b.dot }} />
      <span className="min-w-0 flex-1 truncate font-medium text-ink">{m.name}</span>
      <span className="shrink-0 text-xs text-slate-400">{right ?? `${m.degree} tie${m.degree === 1 ? "" : "s"} · ${ago(m.lastActiveDays)}`}</span>
    </div>
  );
}

// The Relationship OS — a director's instrument, not a report. It reads the
// cohort as a living network and tells the director where to invest.
export default async function RelationshipsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/team/relationships");

  const role = await roleFor(user);
  const directorOrgs = role.memberships.filter((m) => m.role === "director").map((m) => m.org);
  const active = await getActiveOrg(user).catch(() => null);
  let org = directorOrgs.find((o) => active && o.id === active.id) || directorOrgs[0];
  if (!org && role.superadmin && active) org = active;
  if (!org) redirect(role.superadmin ? "/admin/orgs" : "/dashboard");

  const admin = createAdminClient();
  const os = await gatherRelationshipOS(admin, org);
  const pct = (n: number) => (os.members ? Math.round((n / os.members) * 100) : 0);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-2"><Link href="/team" className="text-sm text-slate2 hover:text-ink">← Team</Link><HeaderNav /></div>
      </header>

      <span className="eyebrow text-sage">Relationship OS</span>
      <h1 className="mt-2 font-serif text-4xl leading-tight text-ink">{org.name}</h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-slate2">
        Your cohort as a living network, not a mailing list. This reads who&apos;s strongly tied, whose tie is <b>cooling</b> (catch it before it&apos;s gone), who&apos;s <b>isolated</b>, and who the <b>connectors</b> are. Your move is always the same: invest value where it&apos;s decaying — never extract before you&apos;ve given.
      </p>

      {/* Network health */}
      <section className="mt-8">
        <h2 className="eyebrow mb-3">Network health</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-line bg-white p-4"><div className="text-2xl font-bold text-ink tabular-nums">{os.members.toLocaleString()}</div><div className="mt-0.5 text-xs text-slate2">People</div></div>
          <div className="rounded-2xl border border-line bg-white p-4"><div className="text-2xl font-bold text-ink tabular-nums">{os.edges.toLocaleString()}</div><div className="mt-0.5 text-xs text-slate2">Connections</div><div className="text-[11px] text-slate-400">avg {os.avgDegree.toFixed(1)}/person</div></div>
          <div className="rounded-2xl border border-line bg-white p-4"><div className="text-2xl font-bold text-ink tabular-nums">{Math.round(os.density * 100)}%</div><div className="mt-0.5 text-xs text-slate2">Density</div><div className="text-[11px] text-slate-400">how woven-together</div></div>
          <div className="rounded-2xl border border-line bg-white p-4"><div className="text-2xl font-bold text-ink tabular-nums">{os.isolates.length.toLocaleString()}</div><div className="mt-0.5 text-xs text-slate2">Isolated</div><div className="text-[11px] text-slate-400">no ties yet</div></div>
        </div>
      </section>

      {/* Relationship states */}
      <section className="mt-8">
        <h2 className="eyebrow mb-3">Tie strength</h2>
        <div className="overflow-hidden rounded-2xl border border-line">
          {(["strong", "cooling", "at_risk", "dormant"] as const).map((k, i) => {
            const b = BUCKET_META[k];
            return (
              <div key={k} className={"flex items-center gap-3 px-4 py-3 " + (i > 0 ? "border-t border-line" : "")}>
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: b.dot }} />
                <span className={"w-20 shrink-0 text-sm font-semibold " + b.cls}>{b.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-mist">
                  <div className="h-full rounded-full" style={{ width: `${pct(os.buckets[k])}%`, background: b.dot }} />
                </div>
                <span className="w-12 shrink-0 text-right text-sm font-semibold text-ink tabular-nums">{os.buckets[k]}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-slate-400">Recency + frequency + who they&apos;ve worked with. A tie decays with silence — <b>cooling</b> is the window to act.</p>
      </section>

      {/* The director's three moves */}
      <section className="mt-10">
        <h2 className="eyebrow mb-1">Your moves this week</h2>
        <p className="mb-4 text-sm text-slate2">Three plays, in priority order. Each is a deposit of value, not an ask.</p>

        <div className="rounded-2xl border-2 border-amber/50 bg-amber-soft/40 p-4">
          <div className="text-sm font-bold text-ink">1 · Re-engage the cooling ({os.reengage.length})</div>
          <p className="mt-0.5 text-xs text-slate2">They were active and are slipping. A relevant new module or a personal note now costs far less than winning them back later.</p>
          {os.reengage.length > 0 && (
            <div className="mt-3 overflow-hidden rounded-xl border border-line bg-white">
              {os.reengage.slice(0, 8).map((m, i) => <div key={m.userId} className={i > 0 ? "border-t border-line" : ""}><PersonRow m={m} right={`${BUCKET_META[m.bucket].label} · ${ago(m.lastActiveDays)}`} /></div>)}
            </div>
          )}
        </div>

        <div className="mt-3 rounded-2xl border border-line bg-white p-4">
          <div className="text-sm font-bold text-ink">2 · Bridge the isolated ({os.isolates.length})</div>
          <p className="mt-0.5 text-xs text-slate2">They&apos;ve shown up but have no peer tie — the strongest predictor of drifting away. Pair them, introduce them, or seat them in a live activity.</p>
          {os.isolates.length > 0 && (
            <div className="mt-3 overflow-hidden rounded-xl border border-line">
              {os.isolates.slice(0, 8).map((m, i) => <div key={m.userId} className={i > 0 ? "border-t border-line" : ""}><PersonRow m={m} right={ago(m.lastActiveDays)} /></div>)}
            </div>
          )}
        </div>

        <div className="mt-3 rounded-2xl border border-line bg-white p-4">
          <div className="text-sm font-bold text-ink">3 · Activate the connectors ({os.connectors.length})</div>
          <p className="mt-0.5 text-xs text-slate2">The brokers who move value and referrals across the cohort. Give them something worth passing on — they&apos;re how the relationship goes viral, at zero cost to you.</p>
          {os.connectors.length > 0 && (
            <div className="mt-3 overflow-hidden rounded-xl border border-line">
              {os.connectors.slice(0, 8).map((m, i) => <div key={m.userId} className={i > 0 ? "border-t border-line" : ""}><PersonRow m={m} right={`${m.degree} ties`} /></div>)}
            </div>
          )}
        </div>
      </section>

      {/* The rules of the cohort — interact, don't subvert */}
      <section className="mt-10 rounded-2xl border border-line bg-mist/40 p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-sage">The rules of the cohort</div>
        <p className="mt-1.5 text-sm leading-relaxed text-slate2">
          People strengthen ties by giving each other value — reacting to a peer&apos;s work, endorsing, introducing. The design keeps it positive-sum and <b>subversion-resistant</b>: interactions are <b>bounded</b> (build on a peer&apos;s output, not broadcast to the room), <b>reciprocity-gated</b> (you contribute to receive), <b>reputation-weighted</b> (standing comes from what you give, not what you claim), and <b>rate-limited</b> — so the cohort game rewards contribution and starves spam, self-promotion, and free-riding.
        </p>
      </section>

      {os.members === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-line bg-white p-6 text-center text-sm text-slate2">
          No one in your cohorts yet. As people join and work together, the network fills in here.
        </div>
      )}

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/facilitator/ask" className="btn-dark text-sm">Ask your cohort a question</Link>
        <Link href="/team/outcomes" className="btn-ghost text-sm">See outcomes →</Link>
      </div>
    </main>
  );
}
