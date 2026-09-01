import HeaderNav from "@/components/HeaderNav";
import Logo from "@/components/Logo";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { roleFor } from "@/lib/orgs";
import Tour, { TourButton, type TourStep } from "@/components/Tour";

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
    { show: isStaff, key: "mine", icon: "🗂️", title: "Your modules", desc: "Everything you've built, every type in one place. Jump back in to edit, preview, or run any of it, no matter what kind it is.", href: "/studio/mine", tour: "Everything you've built, all types together and newest first. This is how you get back to a module to edit it without remembering what kind it was." },
    { show: isStaff, key: "create", icon: "🧩", title: "Create a module", desc: "Build an interactive learning experience, no code. Upload materials, talk it through by text or voice, or describe an idea, and the AI drafts it.", href: "/studio/create", tour: "Everything starts here. Three ways in: upload your slides, talk it through with the AI (text or voice), or describe an idea. It drafts a module you edit and launch." },
    { show: isStaff, key: "guide", icon: "📘", title: "How to create a module", desc: "A short guide: what modules are, the shapes to choose from, and the three ways to build and publish one.", href: "/studio/guide", tour: "New to this? A five-minute read on what modules are, the shapes to choose from, and the three ways to build one. Start here." },
    { show: isStaff, key: "live", icon: "🌥️", title: "Author a live prompt", desc: "Write a question the room answers live from their phones — answers aggregate on screen, then AI synthesizes them. Becomes a Live module in your library.", href: "/studio/live", tour: "Author your own Live template: a prompt the room answers live. It joins your library like any other module, assignable and launchable from a cohort." },
    { show: true, key: "cohorts", icon: "👥", title: "Cohorts", desc: "Run a module with a section or session and watch results come in live.", href: "/facilitator", tour: "Once a module exists, run it with a cohort here and watch scores and insights come in live." },
    { show: true, key: "ask", icon: "💬", title: "Ask your cohort", desc: "Chat with everything a cohort has done: what people struggled with, how they performed, what to reinforce next. Grounded in their results.", href: "/facilitator/ask", tour: "Chat with a cohort's data: ask what the room struggled with or how they did, and get answers grounded in their actual results." },
    { show: isStaff, key: "classes", icon: "🏫", title: "Classes", desc: "A department or course that owns a module set. Its cohorts (sections/sessions) inherit those modules, so you set them once and reuse.", href: "/facilitator/classes", tour: "A class is a department or course. Give it a module set once, and every cohort under it inherits those modules." },
    { show: canBuild, key: "review", icon: "✅", title: "Promotion review", desc: "Modules default to your own classes. Approve which ones go org-wide, and (curators) which reach everyone.", href: "/studio/review", tour: "Your modules stay in your own classes by default. This is where good ones get promoted to run org-wide." },
    { show: true, key: "decks", icon: "🖥️", title: "Presentations", desc: "Build slide decks with live word clouds, quizzes, and room photos, and present them full-screen.", href: "/decks", tour: "Build slide decks with live word clouds, quizzes, and room photos, and present them full-screen." },
    { show: true, key: "overview", icon: "📚", title: "Module overview", desc: "A guided deck of every module group: what learners get and the credentials they earn.", href: "/overview", tour: "A guided deck of every module group already in the library: what learners get, and the credentials they earn." },
    { show: true, key: "tour", icon: "📔", title: "Guided tour", desc: "A ten-minute tour of the whole app, start to finish.", href: "/tutorial", tour: "Want the bigger picture? A ten-minute tour of the whole app, start to finish." },
  ].filter((c) => c.show);

  const steps: TourStep[] = cards.map((c) => ({ sel: `[data-tour="${c.key}"]`, title: c.title, body: c.tour }));

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Logo href="/dashboard" />
        <HeaderNav />
      </header>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Studio</h1>
          <p className="mt-1 text-sm text-slate-500">Create and run learning experiences.</p>
        </div>
        <TourButton label="Take a tour" />
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} data-tour={c.key} className="group rounded-2xl border border-line bg-white p-4 transition hover:shadow-sm">
            <div className="text-2xl">{c.icon}</div>
            <div className="mt-2 text-sm font-bold text-ink group-hover:text-ai">{c.title}</div>
            <div className="mt-1 text-sm text-slate-500">{c.desc}</div>
          </Link>
        ))}
      </div>

      <Tour
        steps={steps}
        storageKey="tour:studio:v1"
        welcomeTitle="Welcome to the Studio"
        welcomeBody="This is your workshop for creating and running interactive learning. Here's a 60-second tour of what's here."
      />
    </main>
  );
}
