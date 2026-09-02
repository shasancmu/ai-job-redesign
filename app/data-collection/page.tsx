import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { facilitatorAccess } from "@/lib/orgs";
import HeaderNav from "@/components/HeaderNav";
import Logo from "@/components/Logo";

export const dynamic = "force-dynamic";

// Data collection: gather structured field data via shareable links. Only
// directors and the superadmin can run collections.
export const metadata = { title: "Data collection" };

export default async function DataCollection() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const acc = await facilitatorAccess(user);
  if (!(acc.superadmin || acc.orgIds.length > 0)) redirect("/dashboard");

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <Logo href="/dashboard" />
        <HeaderNav />
      </header>
      <h1 className="text-3xl text-ink">Data collection</h1>
      <p className="mt-1 max-w-2xl text-slate2">
        Gather structured field data through shareable links. Each collection builds a panel you can revisit over time and export.
      </p>

      <div className="mt-6 grid gap-3">
        <Link href="/facilitator/census" className="card group flex items-center gap-4 p-5 transition hover:shadow-lift">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sage-soft text-2xl">🏢</div>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-ink">Business directory</div>
            <div className="text-sm text-slate2">A 10-minute multimodal business profile: geocoded, industry-classified, management-scored, with photos. Builds a longitudinal panel of firms. Worldwide.</div>
          </div>
          <span className="shrink-0 text-slate-300 transition group-hover:text-ink">→</span>
        </Link>

        <div className="rounded-2xl border border-dashed border-line p-5 text-sm text-slate-400">
          More survey types are on the way. The business directory is one example of a collection; others (household, customer, or custom surveys) can be added to this page.
        </div>
      </div>
    </main>
  );
}
