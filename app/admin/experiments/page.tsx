import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HeaderNav from "@/components/HeaderNav";
import Logo from "@/components/Logo";
import { isSuperadmin } from "@/lib/orgs";
import ExperimentsBoard from "@/components/ExperimentsBoard";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin · experiments" };

export default async function AdminExperimentsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await isSuperadmin(user))) redirect("/dashboard");

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-2">
          <Link href="/admin" className="text-sm text-slate2 hover:text-ink">← Admin</Link>
          <HeaderNav />
        </div>
      </header>
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Platform</div>
      <h1 className="text-3xl text-ink">A/B testing</h1>
      <p className="mb-6 mt-1 max-w-2xl text-sm text-slate2">
        The agent proposes subtle A/B tests on your AI interviews. You launch the ones you like. The statistics are computed in code and only call a winner once each arm hits the required sample size, so nothing is decided on a hunch. You decide what to adopt.
      </p>
      <ExperimentsBoard />
    </main>
  );
}
