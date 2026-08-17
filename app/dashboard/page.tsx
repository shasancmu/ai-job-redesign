import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEntitlements } from "@/lib/entitlement";
import { PAYMENTS_ENABLED } from "@/lib/stripe";
import { isAdmin } from "@/lib/admin";
import { titleCaseName } from "@/lib/name";
import { MODULES } from "@/lib/modules";
import Catalog from "@/components/Catalog";
import SessionsPanel from "@/components/SessionsPanel";
import LanguagePicker from "@/components/LanguagePicker";
import EnrichOnce from "@/components/EnrichOnce";
import { recommendedSlugs } from "@/lib/segments";
import { getServerLocale } from "@/lib/i18n-server";
import { makeT } from "@/lib/i18n";
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

  // First-run: send people through onboarding before the dashboard. Guarded so
  // that if the onboarding columns haven't been migrated yet, we DON'T redirect
  // (a missing column would otherwise loop dashboard ⇄ welcome forever).
  {
    const { data: ob, error: obErr } = await supabase
      .from("profiles")
      .select("onboarded_at")
      .eq("id", user.id)
      .maybeSingle();
    if (!obErr && ob && !ob.onboarded_at) redirect("/welcome");
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

  const t = makeT(await getServerLocale());

  // "Recommended for you" — from their onboarding segment + goal.
  const validSlugs = new Set(MODULES.map((m) => m.slug));
  const recommended = recommendedSlugs(
    { segment: (profile as any)?.segment, goal: (profile as any)?.goal },
    validSlugs
  );

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between gap-3">
        <div>
          <Logo />
          <h1 className="mt-3 text-2xl">{t("dash.greeting", { name: profile?.display_name || "there" })}</h1>
        </div>
        <div className="flex items-center gap-2">
          <LanguagePicker me={user.id} initial={(profile as any)?.language} />
          <a href="/profile" className="btn-ghost text-sm">
            {t("nav.profile")}
          </a>
          {instructor && (
            <a href="/facilitator" className="btn-ghost text-sm">
              {t("nav.facilitator")}
            </a>
          )}
          <form action="/auth/signout" method="post">
            <button className="btn-ghost text-sm">{t("nav.signOut")}</button>
          </form>
        </div>
      </header>
      <EnrichOnce />

      <section>
        <h2 className="eyebrow">{t("dash.exercises")}</h2>
        <p className="mb-5 mt-1 max-w-2xl text-sm text-slate2">{t("dash.framing")}</p>
        <Catalog
          userId={user.id}
          unlocked={unlocked}
          initialCohort={searchParams.cohort || ""}
          completed={completed}
          lastCode={lastCode}
          recommended={recommended}
        />
      </section>

      <section className="mt-10">
        <h2 className="eyebrow mb-3">{t("dash.yourSessions")}</h2>
        <SessionsPanel sessions={sessions || []} me={user.id} />
      </section>

      <Footer />
    </main>
  );
}
