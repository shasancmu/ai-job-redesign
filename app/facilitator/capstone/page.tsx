import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HeaderNav from "@/components/HeaderNav";
import Logo from "@/components/Logo";
import { isAdmin } from "@/lib/admin";
import CapstoneRunManager from "@/components/CapstoneRunManager";

export const dynamic = "force-dynamic";

export default async function CapstoneRuns() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.email)) redirect("/dashboard");

  const { data: runs } = await supabase
    .from("capstone_runs")
    .select("id, code, label, created_at")
    .eq("host_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-2">
          <Link href="/facilitator" className="text-sm text-slate2 hover:text-ink">← Cohorts</Link>
          <HeaderNav />
        </div>
      </header>
      <h1 className="text-3xl text-ink">The Number: class runs</h1>
      <p className="mt-1 text-slate2">
        Start a run at the top of class and put the code on the screen. Team captains enter it when they start their team, so this run aggregates on its own and you get a live board of every team's progress.
      </p>
      <div className="mt-6">
        <CapstoneRunManager me={user.id} initial={(runs as any) || []} />
      </div>
    </main>
  );
}
