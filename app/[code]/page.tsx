import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeCode } from "@/lib/classes";
import { titleCaseName } from "@/lib/name";
import { isAdmin } from "@/lib/admin";
import { moduleBySlug } from "@/lib/modules";
import Catalog from "@/components/Catalog";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";

export const dynamic = "force-dynamic";

export default async function ClassPage({ params }: { params: { code: string } }) {
  const code = normalizeCode(params.code);
  if (!code) redirect("/");

  // Read the class regardless of auth (so a signed-out visitor sees its name).
  let klass: any = null;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("classes")
      .select("id, code, name, modules")
      .eq("code", code)
      .maybeSingle();
    klass = data;
  } catch {
    /* service role not set */
  }
  if (!klass) redirect("/");

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Signed-out: invite them to create an account / sign in for THIS class.
  if (!user) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <Logo />
        <div className="mt-10">
          <div className="eyebrow">You&apos;re joining</div>
          <h1 className="mt-2 text-3xl font-bold text-ink">{klass.name}</h1>
          <p className="mt-2 text-slate2">
            Create an account (or sign in) to join this cohort. Everything you do will be part of it.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={`/login?mode=signup&next=/${code}`} className="btn-primary">
              Create an account
            </Link>
            <Link href={`/login?next=/${code}`} className="btn-ghost">
              Sign in
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Ensure a profile exists (and proper-case the name).
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) {
    await supabase.from("profiles").insert({
      id: user.id,
      display_name: titleCaseName(
        (user.user_metadata?.display_name as string) || user.email?.split("@")[0] || "You"
      ),
    });
  } else if (profile.display_name) {
    const clean = titleCaseName(profile.display_name);
    if (clean !== profile.display_name) {
      await supabase.from("profiles").update({ display_name: clean }).eq("id", user.id);
    }
  }

  // Enroll (idempotent).
  await supabase
    .from("class_members")
    .upsert({ class_id: klass.id, user_id: user.id }, { onConflict: "class_id,user_id" });

  const moduleSlugs: string[] = klass.modules || [];
  const unlocked: Record<string, boolean> = {};
  for (const s of moduleSlugs) unlocked[s] = true; // class members get the class's modules

  // Completion within THIS class.
  const [{ data: mySessions }, { data: bench }, { data: net }] = await Promise.all([
    supabase
      .from("sessions")
      .select("code, exercise, status, created_at")
      .eq("cohort", code)
      .or(`host_id.eq.${user.id},guest_id.eq.${user.id}`)
      .order("created_at", { ascending: false }),
    supabase.from("benchmark_results").select("session_id").eq("user_id", user.id).eq("cohort", code).limit(1),
    supabase.from("network_responses").select("cohort").eq("user_id", user.id).eq("cohort", code).limit(1),
  ]);
  const benchmarkDone = (bench?.length || 0) > 0;
  const networkDone = (net?.length || 0) > 0;
  const completed: Record<string, boolean> = {};
  const lastCode: Record<string, string> = {};
  for (const slug of moduleSlugs) {
    const m = moduleBySlug(slug);
    if (!m) continue;
    const runs = (mySessions || []).filter((s: any) => s.exercise === m.exercise);
    if (runs[0]) lastCode[slug] = runs[0].code;
    completed[slug] =
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
          <h1 className="mt-3 text-2xl font-bold text-ink">{klass.name}</h1>
          <div className="mt-0.5 font-mono text-sm text-sage">{code}</div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin(user.email) && (
            <a href={`/facilitator?cohort=${encodeURIComponent(code)}`} className="btn-ghost text-sm">
              Results
            </a>
          )}
          <form action="/auth/signout" method="post">
            <button className="btn-ghost text-sm">Sign out</button>
          </form>
        </div>
      </header>

      {moduleSlugs.length === 0 ? (
        <p className="text-slate2">Your facilitator hasn&apos;t added modules to this class yet.</p>
      ) : (
        <Catalog
          userId={user.id}
          unlocked={unlocked}
          moduleSlugs={moduleSlugs}
          fixedCohort={code}
          completed={completed}
          lastCode={lastCode}
        />
      )}

      <Footer />
    </main>
  );
}
