import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEntitlements } from "@/lib/entitlement";
import { PAYMENTS_ENABLED } from "@/lib/stripe";
import { isAdmin } from "@/lib/admin";
import { MODULES, moduleByExercise } from "@/lib/modules";
import Catalog from "@/components/Catalog";
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
    const display =
      (user.user_metadata?.display_name as string) || user.email?.split("@")[0] || "You";
    await supabase.from("profiles").insert({ id: user.id, display_name: display });
    profile = { id: user.id, display_name: display } as any;
  }

  const instructor = isAdmin(user.email);
  const ents = await getEntitlements(supabase, user.id);
  const unlocked: Record<string, boolean> = {};
  for (const m of MODULES) {
    unlocked[m.slug] = !PAYMENTS_ENABLED || instructor || ents.has("all") || ents.has(m.slug);
  }

  const { data: sessions } = await supabase
    .from("sessions")
    .select("*")
    .or(`host_id.eq.${user.id},guest_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .limit(12);

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
        <h2 className="eyebrow mb-3">Modules</h2>
        <Catalog
          userId={user.id}
          unlocked={unlocked}
          initialCohort={searchParams.cohort || ""}
        />
      </section>

      <section className="mt-10">
        <h2 className="eyebrow mb-3">Your sessions</h2>
        {!sessions || sessions.length === 0 ? (
          <p className="text-slate-500">Nothing yet — open a module above to begin.</p>
        ) : (
          <ul className="space-y-2">
            {sessions.map((s: any) => {
              const m = moduleByExercise(s.exercise || "job");
              return (
                <li key={s.id}>
                  <Link
                    href={`/room/${s.code}`}
                    className="card flex items-center justify-between px-4 py-3 hover:border-slate-300"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-lg font-semibold tracking-widest">
                        {s.code}
                      </span>
                      <span className="text-sm text-slate-500">{m?.name || s.exercise}</span>
                    </div>
                    <span
                      className={
                        "rounded-full px-2.5 py-1 text-xs font-medium " +
                        (s.status === "done"
                          ? "bg-green-100 text-green-700"
                          : s.status === "active"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-slate-100 text-slate-600")
                      }
                    >
                      {s.status}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Footer />
    </main>
  );
}
