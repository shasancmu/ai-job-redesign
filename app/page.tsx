import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PHASES, TOTAL_MINUTES } from "@/lib/exercise";

export default async function Home() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
        In the age of AI
      </div>
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        Reimagine your job.
      </h1>
      <p className="mt-4 max-w-xl text-lg text-slate-600">
        A {TOTAL_MINUTES}-minute exercise for two. You and a partner interview
        each other, then redesign each other&apos;s jobs around what humans do
        best — and what AI can take off your plate.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/login" className="btn-primary">
          Sign in to start
        </Link>
        <Link href="/login?mode=signup" className="btn-ghost">
          Create an account
        </Link>
        <Link href="/join" className="btn-ghost">
          Join a workshop as a guest
        </Link>
      </div>

      <div className="mt-12 card p-6">
        <div className="mb-4 text-sm font-semibold text-slate-500">
          How the {TOTAL_MINUTES} minutes flow
        </div>
        <ol className="space-y-3">
          {PHASES.map((p) => (
            <li key={p.key} className="flex items-baseline gap-3">
              <span className="w-10 shrink-0 text-right text-sm font-semibold text-ai">
                {p.minutes}m
              </span>
              <div>
                <span className="font-medium">{p.title}</span>{" "}
                <span className="text-slate-500">— {p.subtitle}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <p className="mt-8 text-sm text-slate-400">
        Built for Zoom breakout rooms. One person opens a room and shares the
        code; the other joins. Based on the &quot;Reimagine Your Job&quot;
        exercise by Prof. Sharique Hasan, Duke Fuqua.
      </p>
    </main>
  );
}
