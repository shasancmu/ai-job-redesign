import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEntitlements } from "@/lib/entitlement";
import { PAYMENTS_ENABLED } from "@/lib/stripe";
import { isAdmin } from "@/lib/admin";
import { titleCaseName } from "@/lib/name";
import { MODULES } from "@/lib/modules";
import Catalog from "@/components/Catalog";
import SessionsPanel from "@/components/SessionsPanel";
import Footer from "@/components/Footer";
import Logo from "@/components/Logo";

export default async function Dashboard({
  searchParams,
}: {
  searchParams: { cohort?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) {
    const display = titleCaseName(
      (user.user_metadata?.display_name as string) || user.email?.split("@")[0] || "You"
    );
    await supabase.from("profiles").insert({ id: user.id, display_name: display });
    profile = { id: user.id, display_name: display } as any;
  } else if (profile.display_name) {
    // Backfill legacy names to proper case (fixes names saved before this rule).
    const clean = titleCaseName(profile.display_name);
    if (clean !== profile.display_name) {
      await supabase.from("profiles").update({ display_name: clean }).eq("id", user.id);
      profile.display_name = clean;
    }
  }

  const instructor = isAdmin(user.email);
  const ents = await getEntitlements(supabase, user.id);
  const unlocked: Record<string, boolean> = {};
  for (const m of MODULES) {
    unlocked[m.slug] =
      m.forSale === false || !PAYMENTS_ENABLED || instructor || ents.has("all") || ents.has(m.slug);
  }

  const { data: sessions } = await supabase
    .from("sessions")
    .select("*")
    .or(`host_id.eq.${user.id},guest_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .limit(30);

  // Which modules has this person completed, and where's their last run?
  const [{ data: bench }, { data: net }] = await Promise.all([
    supabase.from("benchmark_results").select("session_id").eq("user_id", user.id).limit(1),
    supabase.from("network_responses").select("cohort").eq("user_id", user.id).limit(1),
  ]);
  const benchmarkDone = (bench?.length || 0) > 0;
  const networkDone = (net?.length || 0) > 0;
  const completed: Record<string, boolean> = {};
  const lastCode: Record<string, string> = {};
  for (const m of MODULES) {
    const runs = (sessions || []).filter((s: any) => s.exercise === m.exercise);
    if (runs[0]) lastCode[m.slug] = runs[0].code;
    completed[m.slug] =
      m.exercise === "benchmark"
        ? benchmarkDone
        : m.exercise === "network"
          ? networkDone
          : runs.some((s: any) => s.status === "done");
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between gap-3">
        <div>
          <Logo />
          <h1 className="mt-3 text-2xl">Hi, {profile?.display_name || "there"}</h1>
        </div>
        <div className="flex items-center gap-2">
          {instructor && (
            <a href="/facilitator" className="btn-ghost text-sm">
              Facilitator
            </a>
          )}
          <form action="/auth/signout" method="post">
            <button className="btn-ghost text-sm">Sign out</button>
          </form>
        </div>
      </header>

      <section>
        <h2 className="eyebrow">Exercises</h2>
        <p className="mb-5 mt-1 max-w-2xl text-sm text-slate2">
          One instrument, four ways in: redesign your <span className="font-semibold text-ink">job</span> or your{" "}
          <span className="font-semibold text-ink">workflow</span> — with a{" "}
          <span className="font-semibold text-ink">partner</span>, or with{" "}
          <span className="font-semibold text-ink">AI</span>.
        </p>
        <Catalog
          userId={user.id}
          unlocked={unlocked}
          initialCohort={searchParams.cohort || ""}
          completed={completed}
          lastCode={lastCode}
        />
      </section>

      <section className="mt-10">
        <h2 className="eyebrow mb-3">Your sessions</h2>
        <SessionsPanel sessions={sessions || []} me={user.id} />
      </section>

      <Footer />
    </main>
  );
}
