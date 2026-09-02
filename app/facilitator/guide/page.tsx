import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HeaderNav from "@/components/HeaderNav";
import Logo from "@/components/Logo";
import { roleFor } from "@/lib/orgs";

export const dynamic = "force-dynamic";

// Two audiences, one app. This page makes the split explicit for the people who
// run the space — director and instructor — because it's the one thing that's
// easy to get wrong: the org / class / cohort structure is theirs, not the
// learner's. A learner just sees their program.

const DIRECTOR = [
  { title: "Set up your space", body: "Name it, add your logo and brand color, and decide whether it's invite-only. One choice matters most: whether members can browse the whole library, or only see the work you assign them. Off is the default — and usually the right call." , link: { href: "/team", label: "Organization settings" } },
  { title: "Add your people", body: "Invite members by email — they join instantly if they already have an account. Add instructors the same way, or hand out an instructor invite link (optionally locked to your email domain). A director can also appoint co-directors.", link: { href: "/team", label: "Manage people" } },
  { title: "Organize delivery", body: "A Class is a course or department; a Cohort is one section or session inside it. You can set these up, or just let your instructors create their own — most do.", link: { href: "/facilitator/classes", label: "Classes & cohorts" } },
  { title: "Package outcomes", body: "Group modules into a certificate your members earn — a named path with core and elective modules. It gives learners a reason to finish and you a packaged outcome to point to.", link: { href: "/team/certificates", label: "Certificates" } },
  { title: "See how it's going", body: "Usage, completion and drop-off, and a chat you can ask your cohort's own data. This is how a pilot becomes a case for renewal.", link: { href: "/facilitator", label: "The hub" } },
];

const INSTRUCTOR = [
  { title: "Create a module", body: "Turn your slides or a reading into a launch-ready draft, or just talk it through — an AI interviews you and picks the right format. Everything you author is yours to edit, check, and publish.", link: { href: "/studio/guide", label: "How to create a module" } },
  { title: "Make a cohort", body: "A cohort is the group going through your program — a section, a session, a workshop. Create one (or duplicate a past one with the data wiped) so this run starts clean.", link: { href: "/facilitator/classes", label: "Your classes" } },
  { title: "Assign & share", body: "Attach modules to the cohort so the whole group gets them on their home page, then share the join link. Learners never see the answer key or any hidden layer.", link: { href: "/facilitator", label: "Your cohorts" } },
  { title: "Run it live", body: "Start an activity your whole room joins from their phones — a word cloud, a photo wall, a quiz, a network map. No sign-in needed for them.", link: { href: "/facilitator", label: "Live activities" } },
  { title: "Learn from the room", body: "Review everyone's work in one place, and ask your cohort's data a question in plain language — “what did people struggle with?”, “common themes in the redesigns?”", link: { href: "/facilitator/ask", label: "Ask your cohort" } },
];

const LEARNER_SEES = [
  "Their program — only the exercises assigned to their cohort",
  "Their own progress and any certificate they're working toward",
  "The reports and outputs they've produced",
];

function Track({ steps, tint }: { steps: typeof DIRECTOR; tint: string }) {
  return (
    <ol className="mt-5 space-y-3">
      {steps.map((s, i) => (
        <li key={i} className="flex gap-4 rounded-2xl border border-line bg-white p-4">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: tint }}>{i + 1}</span>
          <div className="min-w-0">
            <div className="font-bold text-ink">{s.title}</div>
            <p className="mt-0.5 text-[15px] leading-relaxed text-slate2">{s.body}</p>
            {s.link && <Link href={s.link.href} className="mt-1.5 inline-block text-sm font-semibold text-sky hover:underline">{s.link.label} →</Link>}
          </div>
        </li>
      ))}
    </ol>
  );
}

export const metadata = { title: "Facilitator guide" };

export default async function FacilitatorGuide() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const role = await roleFor(user);
  const isDirector = role.superadmin || role.directorOrgIds.length > 0;
  const isInstructor = role.instructorOrgIds.length > 0;
  if (!(isDirector || isInstructor)) redirect("/dashboard");
  // A pure instructor reads their own track first; anyone with director reach leads with it.
  const directorFirst = isDirector || !isInstructor;

  const DirectorSection = (
    <section className="mt-14" key="dir">
      <span className="eyebrow text-sage">The director</span>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink">If you run the organization</h2>
      <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-slate2">You own the whole space — the people, the structure, the outcomes, and what members are allowed to see.</p>
      <Track steps={DIRECTOR} tint="#3F7A52" />
    </section>
  );
  const InstructorSection = (
    <section className="mt-14" key="ins">
      <span className="eyebrow text-sky">The instructor</span>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink">If you teach a class</h2>
      <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-slate2">You build modules and run them with your own cohorts. You don't need to touch org settings — that's the director's job.</p>
      <Track steps={INSTRUCTOR} tint="#3B6CA8" />
    </section>
  );

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-2"><Link href="/facilitator" className="text-sm text-slate2 hover:text-ink">← Hub</Link><HeaderNav /></div>
      </header>

      <span className="eyebrow">Guide</span>
      <h1 className="mt-2 font-serif text-4xl leading-tight text-ink">How Superadditive works for your organization</h1>
      <p className="mt-3 max-w-2xl text-lg leading-relaxed text-slate2">
        There are two ways to be in this app. You run it. Your learners live in it. Getting that split clear is the whole thing.
      </p>

      {/* ============================ THE MENTAL MODEL ============================ */}
      <section className="mt-12">
        <span className="eyebrow text-sage">The idea</span>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink">Two audiences, one app</h2>
        <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-slate2">
          <p>
            Superadditive has a structure — an <b className="text-ink">Organization</b> (your school or company), which holds <b className="text-ink">Classes</b> (a course or department), which hold <b className="text-ink">Cohorts</b> (a section or session), which hold your <b className="text-ink">learners</b>. That structure exists so you can organize delivery and reuse what you build.
          </p>
          <p className="rounded-2xl border border-line bg-mist/40 p-4">
            <b className="text-ink">Here's the part that matters:</b> a learner never sees any of it. They sign in and see one thing — <b className="text-ink">their program</b>. The exercises assigned to their cohort, and their own progress. Classes, cohorts, the studio, the full library — that's all yours. It's the machinery behind the curtain, not the experience on stage.
          </p>
          <p>
            So the same app renders as two different products. What follows is your side of it — first if you run the organization, then if you teach a class. The last section is what your learners actually see.
          </p>
        </div>
      </section>

      {/* ============================ ROLE TRACKS ============================ */}
      {directorFirst ? <>{isDirector && DirectorSection}{isInstructor && InstructorSection}</> : <>{InstructorSection}{isDirector && DirectorSection}</>}

      {/* ============================ WHAT A LEARNER SEES ============================ */}
      <section className="mt-14">
        <span className="eyebrow" style={{ color: "#9A6A3A" }}>The other side</span>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink">What a learner sees</h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-slate2">
          When someone in your organization signs in, their home is deliberately simple. No structure to navigate, no library to get lost in — just:
        </p>
        <ul className="mt-4 space-y-2">
          {LEARNER_SEES.map((s) => (
            <li key={s} className="flex items-start gap-2.5 rounded-xl border border-line bg-white p-3 text-[15px] text-slate2">
              <span className="mt-0.5 shrink-0 text-sage">●</span>{s}
            </li>
          ))}
        </ul>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-slate2">
          If you'd rather let members explore everything, a director can turn on library browsing in <Link href="/team" className="font-semibold text-sky hover:underline">Organization settings</Link>. Off by default, because a focused home is what gets people to actually finish.
        </p>
      </section>

      <div className="mt-14 flex flex-wrap gap-3">
        <Link href="/facilitator" className="btn-dark text-sm">Open the hub</Link>
        <Link href="/studio/guide" className="btn-ghost text-sm">How to create a module →</Link>
      </div>
    </main>
  );
}
