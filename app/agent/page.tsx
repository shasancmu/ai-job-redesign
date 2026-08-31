import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Logo from "@/components/Logo";
import HeaderNav from "@/components/HeaderNav";
import ResearchAgent from "@/components/ResearchAgent";

export const dynamic = "force-dynamic";

// Research Agent — one natural-language entry over the Scientifiq platform:
// find collaborators, score an idea's potential, or map a field.
export default async function AgentPage() {
  const { data: { user } } = await createClient().auth.getUser();
  if (!user) redirect("/login?next=/agent");
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Logo href="/dashboard" />
        <HeaderNav />
      </header>
      <span className="eyebrow text-sky">Research Agent</span>
      <h1 className="mt-2 font-serif text-4xl leading-tight text-ink">Ask the ecosystem</h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-slate2">
        One question, the whole platform. Find the people to collaborate with, score an idea&rsquo;s potential across every dimension, or map where a field stands and is heading — grounded in Scientifiq&rsquo;s data and models, never made up.
      </p>
      <div className="mt-6"><ResearchAgent /></div>
    </main>
  );
}
