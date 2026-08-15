import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RoomActions from "@/components/RoomActions";
import { hasAccess } from "@/lib/entitlement";
import { isAdmin } from "@/lib/admin";
import { TOTAL_MINUTES } from "@/lib/exercise";

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

  // Hard gate: unpaid users go to the paywall (dormant if Stripe isn't set up).
  if (!(await hasAccess(supabase, user.id))) redirect("/paywall");

  // Ensure a profile row exists.
  let { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    const display =
      (user.user_metadata?.display_name as string) ||
      user.email?.split("@")[0] ||
      "You";
    await supabase.from("profiles").insert({ id: user.id, display_name: display });
    profile = { id: user.id, display_name: display } as any;
  }

  // Sessions I'm part of.
  const { data: sessions } = await supabase
    .from("sessions")
    .select("*")
    .or(`host_id.eq.${user.id},guest_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .limit(12);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-400">Reimagine Your Job</div>
          <h1 className="text-2xl font-bold">
            Hi, {profile?.display_name || "there"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin(user.email) && (
            <a href="/facilitator" className="btn-ghost text-sm">
              Facilitator
            </a>
          )}
          <form action="/auth/signout" method="post">
            <button className="btn-ghost text-sm">Sign out</button>
          </form>
        </div>
      </header>

      <RoomActions
        userId={user.id}
        displayName={profile?.display_name || "You"}
        savedTitle={profile?.job_title || ""}
        savedDescription={profile?.job_description || ""}
        initialCohort={searchParams.cohort || ""}
      />

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Your sessions
        </h2>
        {!sessions || sessions.length === 0 ? (
          <p className="text-slate-500">
            No sessions yet. Open a room and share the code with your partner —
            the whole exercise takes about {TOTAL_MINUTES} minutes.
          </p>
        ) : (
          <ul className="space-y-2">
            {sessions.map((s: any) => (
              <li key={s.id}>
                <Link
                  href={`/room/${s.code}`}
                  className="card flex items-center justify-between px-4 py-3 hover:border-slate-300"
                >
                  <div>
                    <span className="font-mono text-lg font-semibold tracking-widest">
                      {s.code}
                    </span>
                    <span className="ml-3 text-sm text-slate-500">
                      {s.host_id === user.id ? "you opened" : "you joined"}
                    </span>
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
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
