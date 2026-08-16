import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MODULES } from "@/lib/modules";
import { BRAND } from "@/lib/brand";
import Footer from "@/components/Footer";

export default async function Home() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
        {BRAND.name}
      </div>
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        {BRAND.tagline}
      </h1>
      <p className="mt-4 max-w-xl text-lg text-slate-600">
        Hands-on modules that redesign work for the age of AI — run them in a
        workshop, across your team, or on your own.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/login" className="btn-primary">
          Sign in
        </Link>
        <Link href="/login?mode=signup" className="btn-ghost">
          Create an account
        </Link>
        <Link href="/join" className="btn-ghost">
          Join a workshop as a guest
        </Link>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m) => (
          <div key={m.slug} className="card p-5">
            <div className="text-3xl">{m.emoji}</div>
            <h3 className="mt-2 text-lg font-semibold">{m.name}</h3>
            <p className="mt-1 text-sm text-slate-500">{m.tagline}</p>
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
              <span className="rounded-full bg-slate-100 px-2 py-0.5">{m.mode}</span>
              <span>{m.minutes} min</span>
              {m.ai && <span className="rounded-full bg-ai/10 px-2 py-0.5 text-ai">AI</span>}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-10 text-sm text-slate-400">
        Sign in to run a module. One-time pricing per module, or unlock them all —
        no subscription.
      </p>

      <Footer />
    </main>
  );
}
