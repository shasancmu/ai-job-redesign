import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSim } from "@/lib/ailab/sims";
import Logo from "@/components/Logo";
import HeaderNav from "@/components/HeaderNav";
import AiLab from "@/components/ailab/AiLab";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { sim: string } }) {
  const sim = getSim(params.sim);
  return { title: sim ? sim.name : "AI Skills Lab" };
}

function code() { const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let o = ""; for (let i = 0; i < 6; i++) o += c[Math.floor(Math.random() * c.length)]; return o; }

export default async function LabRun({ params }: { params: { sim: string } }) {
  const sim = getSim(params.sim);
  if (!sim) notFound();

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/lab/${params.sim}`);

  // Client-safe projection: never ship the trap spoiler to the browser.
  const clientSim = {
    kind: sim.kind, slug: sim.slug, name: sim.name, tagline: sim.tagline, intro: sim.intro,
    concepts: sim.concepts, transfer: sim.transfer, takeaway: sim.takeaway,
    challenges: sim.challenges.map((c) => ({
      id: c.id, title: c.title, brief: c.brief, concept: c.concept, passScore: c.passScore,
      rubric: c.rubric.map((r) => ({ key: r.key, label: r.label, help: r.help })),
      target: c.target, starter: c.starter,
      goal: c.goal, tools: c.tools?.map((t) => ({ name: t.name, description: t.description, destructive: !!t.destructive })),
      spec_fields: c.spec_fields, build_target: c.build_target,
    })),
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <Logo href="/dashboard" />
        <HeaderNav />
      </header>
      <AiLab sim={clientSim as any} code={`LAB-${sim.slug.slice(0, 4).toUpperCase()}-${code()}`} />
    </main>
  );
}
