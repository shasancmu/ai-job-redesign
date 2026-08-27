import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HeaderNav from "@/components/HeaderNav";
import Logo from "@/components/Logo";
import { isAdmin } from "@/lib/admin";
import { getSpec } from "@/lib/mechanics/store";
import SpecEditor from "@/components/SpecEditor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BLANK = {
  schemaVersion: 1, slug: "my-module", mechanic: "roleplay",
  meta: { name: "New module", tagline: "", emoji: "🎭", audience: "", minutes: 20, partner: "ai" },
  objective: { goal: "", aha: "" }, world: "",
  roles: [
    { key: "char", kind: "character", name: "", model: "main", knowsScenario: true, persona: "", behavior: "" },
    { key: "examiner", kind: "examiner", name: "Examiner", model: "fast", knowsScenario: true },
  ],
  probes: [], scenarios: [], selection: { mode: "deterministic" },
  flow: [
    { key: "brief", kind: "brief", title: "The brief", minutes: 4, intro: "" },
    { key: "talk", kind: "converse", title: "The conversation", minutes: 12, with: "char", budget: 7, aiOpens: false },
    { key: "verdict", kind: "verdict", title: "Your call", minutes: 3, verdict: [{ key: "call", label: "Your call", type: "choice", options: [] }, { key: "confidence", label: "Confidence", type: "scale" }, { key: "flip", label: "What would change your mind", type: "text" }] },
    { key: "report", kind: "report", title: "How you did", minutes: 3 },
  ],
  rubric: { gradedBy: "examiner", instructions: "", output: [{ key: "score", label: "Score", type: "score", range: [0, 100] }, { key: "verdict_correct", label: "Right call", type: "bool" }, { key: "the_tell", label: "The tell", type: "text" }, { key: "principle", label: "Principle", type: "text" }] },
  report: [{ type: "verdictLine", source: "score" }, { type: "section", source: "the_tell", title: "The tell" }, { type: "principle", source: "principle" }],
  guardrails: { language: "en", neverReveal: ["the active scenario", "the hidden narrative"], immutable: ["the character never states a falsehood", "the active scenario is fixed for the session and never revealed", "the character has no tools or data access"], safety: "fictional entities only" },
};

export default async function EditRoleplay({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.email)) redirect("/dashboard");

  const isNew = params.slug === "new";
  const spec = isNew ? BLANK : (await getSpec(params.slug)) || BLANK;

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-2"><Link href="/studio/roleplay" className="text-sm text-slate2 hover:text-ink">← Modules</Link><HeaderNav /></div>
      </header>
      <h1 className="text-2xl font-bold text-ink">{isNew ? "New role-play module" : `Edit: ${(spec as any).meta?.name || params.slug}`}</h1>
      <SpecEditor me={user.id} initial={spec} />
    </main>
  );
}
