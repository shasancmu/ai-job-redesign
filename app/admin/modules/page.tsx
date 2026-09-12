import HeaderNav from "@/components/HeaderNav";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperadmin } from "@/lib/orgs";
import { listAllCustomModules } from "@/lib/customModules";
import { MODULES, CATEGORIES, moduleCategory, modulePills, pillLabel } from "@/lib/modules";
import Logo from "@/components/Logo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · modules" };

const catTitle = (key: string) => CATEGORIES.find((c) => c.key === key)?.title || key;

function fmtDate(s?: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";
}

export default async function ModulesAdminPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await isSuperadmin(user))) redirect("/dashboard");

  // Built-ins (the static catalog) + custom modules (the DB), merged into one
  // complete registry. Resolve org + author names for the custom rows.
  const custom = await listAllCustomModules();
  const admin = createAdminClient();
  const orgIds = [...new Set(custom.map((c) => c.org_id).filter(Boolean) as string[])];
  const authorIds = [...new Set(custom.map((c) => c.author_id).filter(Boolean) as string[])];
  const [{ data: orgs }, { data: profs }] = await Promise.all([
    orgIds.length ? admin.from("organizations").select("id, name").in("id", orgIds) : Promise.resolve({ data: [] as any[] }),
    authorIds.length ? admin.from("profiles").select("id, display_name").in("id", authorIds) : Promise.resolve({ data: [] as any[] }),
  ]);
  const orgName = new Map((orgs || []).map((o: any) => [o.id, o.name]));
  const authorName = new Map((profs || []).map((p: any) => [p.id, p.display_name]));

  const builtins = MODULES.map((m) => ({
    slug: m.slug, exercise: m.exercise, name: m.name,
    category: moduleCategory(m.slug), pills: modulePills(m.slug),
    partner: m.partner, minutes: m.minutes, hidden: !!m.hidden, forSale: !!m.forSale,
  }));

  const total = builtins.length + custom.length;
  const hiddenCount = builtins.filter((b) => b.hidden).length;
  const publishedCustom = custom.filter((c) => c.status === "published").length;

  // Built-ins grouped by catalog category, in the CATEGORIES order.
  const byCat = CATEGORIES.map((c) => ({ ...c, mods: builtins.filter((b) => b.category === c.key) })).filter((g) => g.mods.length);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Logo href="/dashboard" />
        <HeaderNav />
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">Module registry</h1>
        <Link href="/admin" className="text-sm font-medium text-ai hover:underline">← Admin</Link>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        The complete list of every runnable module: the static built-in catalog plus author-built custom modules from the database. Superadmin-only.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat n={total} label="Total modules" />
        <Stat n={builtins.length} label="Built-in" sub={`${hiddenCount} hidden`} />
        <Stat n={custom.length} label="Custom" sub={`${publishedCustom} published`} />
        <Stat n={CATEGORIES.length} label="Categories" />
      </div>

      {/* Built-ins */}
      <section className="mt-9">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Built-in catalog</h2>
          <span className="text-xs text-slate-400"><code className="rounded bg-mist px-1">lib/modules.ts</code> · {builtins.length}</span>
        </div>
        <div className="space-y-6">
          {byCat.map((g) => (
            <div key={g.key}>
              <div className="mb-1.5 flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: g.dot }} />
                <span className="text-sm font-semibold text-ink">{g.title}</span>
                <span className="text-xs text-slate-400">· {g.mods.length}</span>
              </div>
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-line bg-mist/50 text-left text-[11px] uppercase tracking-wide text-slate-400">
                      <th className="px-3 py-2 font-semibold">Module</th>
                      <th className="px-3 py-2 font-semibold">exercise key</th>
                      <th className="px-3 py-2 font-semibold">Topics</th>
                      <th className="px-3 py-2 font-semibold">Partner</th>
                      <th className="px-3 py-2 text-right font-semibold">Min</th>
                      <th className="px-3 py-2 font-semibold">Flags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.mods.map((m) => (
                      <tr key={m.slug} className="border-b border-line/60 last:border-0">
                        <td className="px-3 py-2">
                          <div className="font-medium text-ink">{m.name}</div>
                          <div className="text-xs text-slate-400"><code>{m.slug}</code></div>
                        </td>
                        <td className="px-3 py-2"><code className="text-xs text-slate2">{m.exercise}</code></td>
                        <td className="px-3 py-2">
                          {m.pills.length
                            ? <span className="flex flex-wrap gap-1">{m.pills.map((p) => <span key={p} className="rounded-full bg-mist px-2 py-0.5 text-[11px] text-slate2">{pillLabel(p)}</span>)}</span>
                            : <span className="text-xs text-clay">none</span>}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate2">{m.partner}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate2">{m.minutes}</td>
                        <td className="px-3 py-2">
                          <span className="flex flex-wrap gap-1">
                            {m.hidden && <span className="rounded-full bg-clay-soft px-2 py-0.5 text-[11px] text-clay">hidden</span>}
                            {m.forSale && <span className="rounded-full bg-sage-soft px-2 py-0.5 text-[11px] text-sage">for sale</span>}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Custom */}
      <section className="mt-10">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Custom modules</h2>
          <span className="text-xs text-slate-400"><code className="rounded bg-mist px-1">custom_modules</code> table · {custom.length}</span>
        </div>
        {custom.length === 0 ? (
          <div className="rounded-xl border border-line px-4 py-6 text-sm text-slate-400">No author-built custom modules exist yet.</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-line bg-mist/50 text-left text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="px-3 py-2 font-semibold">Module</th>
                  <th className="px-3 py-2 font-semibold">exercise key</th>
                  <th className="px-3 py-2 font-semibold">Type</th>
                  <th className="px-3 py-2 font-semibold">Visibility</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Author</th>
                  <th className="px-3 py-2 font-semibold">Updated</th>
                </tr>
              </thead>
              <tbody>
                {custom.map((c) => (
                  <tr key={c.slug} className="border-b border-line/60 last:border-0">
                    <td className="px-3 py-2">
                      <div className="font-medium text-ink">{c.name || c.slug}</div>
                      <div className="text-xs text-slate-400"><code>{c.slug}</code></div>
                    </td>
                    <td className="px-3 py-2"><code className="text-xs text-slate2">{c.exercise}</code></td>
                    <td className="px-3 py-2 text-xs text-slate2">{c.super_type || "—"}</td>
                    <td className="px-3 py-2 text-xs">
                      {c.org_id
                        ? <span className="rounded-full bg-sky-soft px-2 py-0.5 text-[11px] text-sky">{orgName.get(c.org_id) || "org"}</span>
                        : <span className="rounded-full bg-mist px-2 py-0.5 text-[11px] text-slate2">Global</span>}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <span className={"rounded-full px-2 py-0.5 text-[11px] " + (c.status === "published" ? "bg-sage-soft text-sage" : "bg-amber-soft text-amber")}>{c.status || "—"}</span>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate2">{(c.author_id && authorName.get(c.author_id)) || "—"}</td>
                    <td className="px-3 py-2 text-xs tabular-nums text-slate-400">{fmtDate(c.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function Stat({ n, label, sub }: { n: number; label: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-line px-4 py-3">
      <div className="text-2xl font-bold tabular-nums text-ink">{n}</div>
      <div className="text-xs text-slate-500">{label}</div>
      {sub && <div className="text-[11px] text-slate-400">{sub}</div>}
    </div>
  );
}
