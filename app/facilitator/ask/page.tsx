import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import HeaderNav from "@/components/HeaderNav";
import { facilitatorAccess } from "@/lib/orgs";
import CohortChat from "@/components/CohortChat";

export const dynamic = "force-dynamic";

export default async function AskCohortPage({ searchParams }: { searchParams?: { cohort?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await facilitatorAccess(user)).ok) redirect("/dashboard");

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <div className="flex items-center justify-between gap-3">
        <Link href="/facilitator" className="text-sm text-slate2 hover:text-ink">← Cohorts</Link>
        <HeaderNav />
      </div>
      <h1 className="mt-1 text-2xl font-bold text-ink">Ask your cohort</h1>
      <p className="mb-6 text-slate2">Chat with everything a cohort has done. Ask what people struggled with, what to reinforce, or how the room performed, and get answers grounded in their actual results.</p>
      <CohortChat initialCohort={searchParams?.cohort} />
    </main>
  );
}
