import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSuperadmin } from "@/lib/orgs";
import Logo from "@/components/Logo";
import HeaderNav from "@/components/HeaderNav";
import BatchScore from "@/components/BatchScore";

export const dynamic = "force-dynamic";

// Batch scorer — upload a set of abstracts, get the full impact fingerprint for
// each (commercial / scientific / social / defense / complex / interdisciplinary),
// downloadable as CSV. Superadmin only (bulk tool, includes the gated Defense model).
export default async function BatchPage() {
  const { data: { user } } = await createClient().auth.getUser();
  if (!user) redirect("/login?next=/batch");
  if (!(await isSuperadmin(user))) redirect("/dashboard");
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Logo href="/dashboard" />
        <HeaderNav />
      </header>
      <span className="eyebrow text-sage">Batch scorer</span>
      <h1 className="mt-2 font-serif text-4xl leading-tight text-ink">Score a whole portfolio</h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-slate2">
        Upload up to 50 abstracts (a lab, a department, a funder&rsquo;s awards) and get every paper&rsquo;s
        six-dimensional impact fingerprint at once — then sort to surface the hidden gems, the defense-relevant
        work, or the cross-disciplinary bridges. Download the whole table as CSV.
      </p>
      <div className="mt-6"><BatchScore /></div>
    </main>
  );
}
