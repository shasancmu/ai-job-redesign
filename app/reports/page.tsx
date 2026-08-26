import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MODULES } from "@/lib/modules";
import { artifactHref, timeAgo } from "@/lib/momentum";
import ModuleIcon from "@/components/ModuleIcon";
import Logo from "@/components/Logo";
import HeaderNav from "@/components/HeaderNav";
import Footer from "@/components/Footer";

export const dynamic = "force-dynamic";

// Every saved report/artifact this person has, in one place.
export default async function Reports() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, exercise, code, status, created_at, host_id, guest_id")
    .or(`host_id.eq.${user.id},guest_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .limit(300);

  // One report per module with a finished run, newest first. Group activities
  // (benchmark/network) have no personal artifact, so they're excluded.
  type R = { slug: string; name: string; href: string; at: string };
  const reports: R[] = [];
  for (const m of MODULES) {
    if (m.partner === "group") continue;
    const mine = (sessions || []).filter((s: any) => s.exercise === m.exercise);
    const doneRun = mine.find((s: any) => s.status === "done");
    if (!doneRun) continue;
    reports.push({ slug: m.slug, name: m.name, href: artifactHref(m.exercise, doneRun.code), at: doneRun.created_at });
  }
  reports.sort((a, b) => (a.at < b.at ? 1 : -1));

  // Gifts received: the reimagined role a partner designed for you in a paired
  // job-redesign ("job") session. Opens the wrapped reveal at /gift/[code].
  type G = { code: string; giverName: string; at: string };
  let gifts: G[] = [];
  const jobSessions = (sessions || []).filter((s: any) => s.exercise === "job" && s.host_id && s.guest_id);
  if (jobSessions.length) {
    const ids = jobSessions.map((s: any) => s.id);
    const { data: wss } = await supabase
      .from("workspaces")
      .select("session_id, author_id, plan, final_description, new_job_description")
      .in("session_id", ids);
    const bySession = new Map<string, any[]>();
    for (const w of (wss as any[]) || []) {
      const arr = bySession.get(w.session_id) || [];
      arr.push(w);
      bySession.set(w.session_id, arr);
    }
    const hasContent = (w: any) =>
      !!w &&
      ((w.plan && (w.plan.headline || w.plan.summary || (w.plan.human?.length || 0) + (w.plan.ai?.length || 0) > 0)) ||
        w.final_description ||
        w.new_job_description);
    const raw: { code: string; giverId: string; at: string }[] = [];
    for (const s of jobSessions) {
      const partnerId = s.host_id === user.id ? s.guest_id : s.host_id;
      if (!partnerId) continue;
      const w = (bySession.get(s.id) || []).find((x) => x.author_id === partnerId);
      if (hasContent(w)) raw.push({ code: s.code, giverId: partnerId, at: s.created_at });
    }
    raw.sort((a, b) => (a.at < b.at ? 1 : -1));
    const giverIds = [...new Set(raw.map((g) => g.giverId))];
    let nameById = new Map<string, string>();
    if (giverIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id, display_name").in("id", giverIds);
      nameById = new Map(((profs as any[]) || []).map((p) => [p.id, p.display_name]));
    }
    gifts = raw.map((g) => ({ code: g.code, giverName: nameById.get(g.giverId) || "your partner", at: g.at }));
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between gap-3">
        <div>
          <Logo href="/dashboard" />
          <h1 className="mt-3 text-3xl text-ink">Your reports</h1>
          <p className="mt-1 text-sm text-slate2">Everything you&apos;ve saved, open any time.</p>
        </div>
        <HeaderNav />
      </header>

      {reports.length === 0 && gifts.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-slate-600">No reports yet.</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate2">
            Every exercise ends in something you keep, a plan, a roadmap, an X-ray, a consult. Finish one and it lands here.
          </p>
          <Link href="/dashboard" className="btn-primary mt-4 inline-block text-sm">Browse exercises</Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {gifts.map((g) => (
            <div key={`gift-${g.code}`} className="card flex flex-col overflow-hidden p-0 transition hover:shadow-lift">
              <div className="h-1.5" style={{ background: "linear-gradient(90deg, #3F7A52, #CE8F2C)" }} />
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-mist text-lg" aria-hidden>
                    🎁
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-ink">Your reimagined role</div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      A gift from {g.giverName} · {timeAgo(g.at)}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <Link href={`/gift/${g.code}`} className="font-medium text-ink hover:underline">
                    Open gift →
                  </Link>
                </div>
              </div>
            </div>
          ))}
          {reports.map((it) => (
            <div key={it.slug} className="card flex flex-col p-5 transition hover:shadow-lift">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-mist text-ink">
                  <ModuleIcon slug={it.slug} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-ink">{it.name}</div>
                  <div className="mt-0.5 text-xs text-slate-400">Saved {timeAgo(it.at)}</div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <Link href={it.href} className="font-medium text-ink hover:underline">Open report →</Link>
                <Link href={`/start/${it.slug}`} className="text-xs text-slate-400 hover:text-ink">Do again</Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <Footer />
    </main>
  );
}
