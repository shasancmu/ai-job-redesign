import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";
import { moduleByExercise } from "@/lib/modules";
import AdminUsage from "@/components/AdminUsage";
import Logo from "@/components/Logo";

export const dynamic = "force-dynamic";

type Sess = { host_id: string; exercise: string; status: string; created_at: string };

function moduleName(ex: string): string {
  return moduleByExercise(ex)?.name || ex;
}

function weekStart(iso: string): string {
  const d = new Date(iso);
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - day);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}
function lastNWeeks(n: number): string[] {
  const now = new Date();
  const day = (now.getUTCDay() + 6) % 7;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - day);
  monday.setUTCHours(0, 0, 0, 0);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() - i * 7);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export default async function AdminUsagePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.email)) redirect("/dashboard");

  let sessions: Sess[] = [];
  const nameById = new Map<string, string>();
  const emailById = new Map<string, string>();
  let ready = false;

  try {
    const admin = createAdminClient();

    // All sessions (paged past the 1000-row default).
    for (let from = 0; from < 60000; from += 1000) {
      const { data, error } = await admin
        .from("sessions")
        .select("host_id, exercise, status, created_at")
        .order("created_at", { ascending: true })
        .range(from, from + 999);
      if (error || !data || data.length === 0) break;
      sessions.push(...(data as Sess[]));
      if (data.length < 1000) break;
    }

    const { data: profiles } = await admin.from("profiles").select("id, display_name");
    for (const p of profiles || []) if (p.display_name) nameById.set(p.id, p.display_name);

    for (let page = 1; page <= 50; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error || !data?.users?.length) break;
      for (const u of data.users) emailById.set(u.id, u.email || "");
      if (data.users.length < 1000) break;
    }
    ready = true;
  } catch {
    ready = false;
  }

  // ---- aggregate ----
  type U = { runs: number; done: number; modules: Set<string>; byModule: Map<string, { runs: number; done: number }>; first: string; last: string };
  const perUser = new Map<string, U>();
  const byModule = new Map<string, { runs: number; done: number }>();
  const weekly = new Map<string, number>();

  for (const s of sessions) {
    const isDone = s.status === "done";
    let u = perUser.get(s.host_id);
    if (!u) { u = { runs: 0, done: 0, modules: new Set(), byModule: new Map(), first: s.created_at, last: s.created_at }; perUser.set(s.host_id, u); }
    u.runs++; if (isDone) u.done++;
    u.modules.add(s.exercise);
    const ubm = u.byModule.get(s.exercise) || { runs: 0, done: 0 };
    ubm.runs++; if (isDone) ubm.done++; u.byModule.set(s.exercise, ubm);
    if (s.created_at < u.first) u.first = s.created_at;
    if (s.created_at > u.last) u.last = s.created_at;

    const gm = byModule.get(s.exercise) || { runs: 0, done: 0 };
    gm.runs++; if (isDone) gm.done++; byModule.set(s.exercise, gm);

    const wk = weekStart(s.created_at);
    weekly.set(wk, (weekly.get(wk) || 0) + 1);
  }

  const users = [...perUser.entries()]
    .map(([id, u]) => {
      const top = [...u.byModule.entries()].sort((a, b) => b[1].runs - a[1].runs)[0];
      return {
        id,
        name: nameById.get(id) || "",
        email: emailById.get(id) || "",
        runs: u.runs,
        done: u.done,
        modules: u.modules.size,
        top: top ? moduleName(top[0]) : "",
        last: u.last,
        first: u.first,
      };
    })
    .sort((a, b) => b.runs - a.runs);

  const modules = [...byModule.entries()]
    .map(([ex, m]) => ({ ex, name: moduleName(ex), runs: m.runs, done: m.done }))
    .sort((a, b) => b.runs - a.runs);

  const activity = lastNWeeks(12).map((wk) => ({ wk, runs: weekly.get(wk) || 0 }));

  const totals = {
    users: perUser.size,
    runs: sessions.length,
    done: sessions.reduce((n, s) => n + (s.status === "done" ? 1 : 0), 0),
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Logo />
        <Link href="/facilitator" className="btn-ghost text-sm">← Facilitator</Link>
      </header>
      <h1 className="text-2xl font-bold text-ink">Usage</h1>
      <p className="mt-1 text-sm text-slate-500">Who's using the platform, what they run, and how much they finish. Only you can see this.</p>

      {!ready ? (
        <div className="mt-6 rounded-xl bg-mist px-4 py-5 text-sm text-slate2">Couldn&apos;t load usage. The service-role key must be set for this page.</div>
      ) : (
        <div className="mt-6"><AdminUsage totals={totals} users={users} modules={modules} activity={activity} /></div>
      )}
    </main>
  );
}
