import HeaderNav from "@/components/HeaderNav";
import Logo from "@/components/Logo";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { roleFor } from "@/lib/orgs";

export const dynamic = "force-dynamic";

// Studio: everything for creating and running learning experiences, in one
// place, so the account menu stays lean. Open to instructors, directors, and
// superadmins; individual tools gate by role.
export default async function StudioPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const role = await roleFor(user);
  const isStaff = role.superadmin || role.directorOrgIds.length > 0 || role.instructorOrgIds.length > 0;
  if (!isStaff) redirect("/dashboard");
  const canBuild = role.superadmin || role.directorOrgIds.length > 0;

  const cards = [
    { show: true, icon: "🖥️", title: "Presentations", desc: "Build slide decks with live word clouds, quizzes, and room photos, and present them full-screen.", href: "/decks" },
    { show: canBuild, icon: "🧩", title: "Create a module", desc: "Start from a template and build an interactive learning experience, no code. Interviews, scorecards, and role-play like The Earnings Call.", href: "/studio/create" },
    { show: canBuild, icon: "✅", title: "Promotion review", desc: "Modules default to your own classes. Approve which ones go org-wide, and (curators) which reach everyone.", href: "/studio/review" },
    { show: true, icon: "👥", title: "Cohorts", desc: "Run modules with a class or cohort and watch results come in live.", href: "/facilitator" },
    { show: true, icon: "📚", title: "Module overview", desc: "A guided deck of every module group: what learners get and the credentials they earn.", href: "/overview" },
    { show: true, icon: "📔", title: "Guided tour", desc: "A ten-minute tour of the whole app, start to finish.", href: "/tutorial" },
  ].filter((c) => c.show);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Logo href="/dashboard" />
        <HeaderNav />
      </header>
      <h1 className="text-2xl font-bold text-ink">Studio</h1>
      <p className="mt-1 text-sm text-slate-500">Create and run learning experiences.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="group rounded-2xl border border-line bg-white p-4 transition hover:shadow-sm">
            <div className="text-2xl">{c.icon}</div>
            <div className="mt-2 text-sm font-bold text-ink group-hover:text-ai">{c.title}</div>
            <div className="mt-1 text-sm text-slate-500">{c.desc}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
