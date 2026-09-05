import Link from "next/link";
import { notFound } from "next/navigation";
import LivingCaseReader from "@/components/LivingCaseReader";
import { caseBySlug } from "@/lib/cases/registry";
import { loadLivingCase } from "@/lib/cases/store";
import { caseEnrollmentGate } from "@/lib/cases/access";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const c = caseBySlug(params.slug);
  return { title: c ? `${c.title} · Living Case` : "Living Case" };
}

export default async function CasePage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Built-in cases first (hand-authored), then authored/generated ones from the DB.
  let genome = caseBySlug(params.slug);
  if (!genome) genome = await loadLivingCase(params.slug, user?.id ?? null);
  if (!genome) notFound();

  // Enrollment gate: an "enrolled" case is only for its author + members of an
  // assigned class. Others get an enroll/sign-in screen instead of the reader.
  const gate = await caseEnrollmentGate(params.slug, genome, user?.id ?? null);
  if (!gate.allowed) {
    const next = encodeURIComponent(`/cases/${params.slug}`);
    return (
      <main className="grid min-h-screen place-items-center bg-paper px-6">
        <div className="w-full max-w-md rounded-2xl border border-line bg-white p-8 text-center shadow-sm">
          <div className="text-3xl">🔒</div>
          <h1 className="mt-3 font-serif text-2xl font-bold text-ink">This case is for enrolled students</h1>
          <p className="mx-auto mt-2 text-sm text-slate2">
            {gate.reason === "signin"
              ? "Sign in and join the class to open it."
              : <>You're not enrolled in {gate.className ? <b className="text-ink">{gate.className}</b> : "this class"} yet. Join it to open the case.</>}
          </p>
          {gate.reason === "signin"
            ? <Link href={`/login?next=${next}`} className="btn-primary mt-5 inline-block">Sign in</Link>
            : <Link href={`/${gate.joinCode}?next=${next}`} className="btn-primary mt-5 inline-block">Join the class →</Link>}
          <p className="mt-3 text-xs text-slate-400">Ask your instructor for the class code if you don't have it.</p>
        </div>
      </main>
    );
  }

  return <LivingCaseReader genome={genome} draft={!!(genome as any)._draft} />;
}
