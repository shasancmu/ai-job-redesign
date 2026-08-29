import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roleFor, getActiveOrg } from "@/lib/orgs";
import { gatherPerson } from "@/lib/relationships";
import Logo from "@/components/Logo";
import HeaderNav from "@/components/HeaderNav";

export const dynamic = "force-dynamic";

const BUCKET: Record<string, { label: string; cls: string }> = {
  strong: { label: "Strong", cls: "bg-emerald-50 text-emerald-700" },
  cooling: { label: "Cooling", cls: "bg-amber-50 text-amber-800" },
  at_risk: { label: "At risk", cls: "bg-orange-50 text-orange-700" },
  dormant: { label: "Dormant", cls: "bg-mist text-slate2" },
};

function day(iso: string): string {
  try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); } catch { return ""; }
}
function ago(d: number | null): string {
  if (d == null) return "never active";
  if (d === 0) return "active today";
  if (d < 30) return `active ${d}d ago`;
  if (d < 365) return `active ${Math.round(d / 30)}mo ago`;
  return `active ${Math.round(d / 365)}y ago`;
}

export default async function PersonPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const role = await roleFor(user);
  const active = await getActiveOrg(user).catch(() => null);
  const directorOrgs = role.memberships.filter((m) => m.role === "director").map((m) => m.org);
  let org = directorOrgs.find((o) => active && o.id === active.id) || directorOrgs[0];
  if (!org && role.superadmin && active) org = active;
  if (!org) redirect("/dashboard");

  const admin = createAdminClient();
  const p = await gatherPerson(admin, org, params.id);
  if (!p) redirect("/team/relationships"); // not a member of this org

  const b = BUCKET[p.state.bucket];

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-2"><Link href="/team/relationships" className="text-sm text-slate2 hover:text-ink">← Relationship OS</Link><HeaderNav /></div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-4xl leading-tight text-ink">{p.name}</h1>
        <span className={"rounded-full px-2.5 py-0.5 text-xs font-semibold " + b.cls}>{b.label}</span>
      </div>
      <p className="mt-2 text-sm text-slate2">{ago(p.state.lastActiveDays)} · {p.state.runs} exercise{p.state.runs === 1 ? "" : "s"} · {p.state.degree} peer tie{p.state.degree === 1 ? "" : "s"}</p>

      {/* Activity timeline */}
      <section className="mt-8">
        <h2 className="eyebrow mb-3">Timeline</h2>
        {p.timeline.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-white p-5 text-sm text-slate-400">No activity yet.</div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-line">
            {p.timeline.map((t, i) => (
              <div key={i} className={"flex items-center gap-3 px-4 py-2.5 text-sm " + (i > 0 ? "border-t border-line" : "")}>
                <span className="text-lg" aria-hidden>{t.emoji}</span>
                <span className="min-w-0 flex-1 truncate text-ink">{t.name}</span>
                {t.done && <span className="shrink-0 rounded-full bg-sage-soft px-2 py-0.5 text-[11px] font-medium text-sage">done</span>}
                <span className="shrink-0 text-xs text-slate-400">{day(t.at)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Peers */}
      {p.peers.length > 0 && (
        <section className="mt-8">
          <h2 className="eyebrow mb-3">Peers they&apos;ve worked with</h2>
          <div className="flex flex-wrap gap-2">
            {p.peers.map((pe) => (
              <Link key={pe.userId} href={`/team/person/${pe.userId}`} className="rounded-full border border-line bg-white px-3 py-1 text-sm text-slate2 transition hover:border-slate-300 hover:text-ink">{pe.name}</Link>
            ))}
          </div>
        </section>
      )}

      {/* Pushes received */}
      <section className="mt-8">
        <h2 className="eyebrow mb-3">What they&apos;ve been sent</h2>
        {p.pushes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-white p-5 text-sm text-slate-400">Nothing yet — send a value drop from the console.</div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-line">
            {p.pushes.map((pu, i) => (
              <div key={i} className={"flex items-center gap-3 px-4 py-2.5 text-sm " + (i > 0 ? "border-t border-line" : "")}>
                <span className="min-w-0 flex-1 truncate text-ink">{pu.title}</span>
                <span className="shrink-0 text-xs font-medium text-slate-400">{pu.clicked ? "clicked" : pu.seen ? "seen" : "sent"}</span>
                <span className="shrink-0 text-xs text-slate-400">{day(pu.at)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="mt-10">
        <Link href="/team/relationships" className="btn-ghost text-sm">← Back to the network</Link>
      </div>
    </main>
  );
}
