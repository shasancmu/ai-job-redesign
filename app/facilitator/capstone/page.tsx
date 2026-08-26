import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import HeaderNav from "@/components/HeaderNav";
import { isAdmin } from "@/lib/admin";
import CapstoneManager from "@/components/CapstoneManager";

export const dynamic = "force-dynamic";

export default async function FacilitatorCapstone() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.email)) redirect("/dashboard");

  const { data: sessions } = await supabase
    .from("capstone_sessions")
    .select("id, code, status, created_at")
    .eq("host_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6">
        <div className="flex items-center justify-between gap-3">
          <Link href="/facilitator" className="text-sm text-slate2 hover:text-ink">← Cohorts</Link>
          <HeaderNav />
        </div>
        <h1 className="mt-1 text-3xl text-ink">The Number</h1>
        <p className="mt-1 text-slate2">
          A team capstone. Start a session, then give each four-person team the code. They run a CFO's office and must close the gap to consensus using legal earnings management, survive an analyst call, and face what it costs the company later.
        </p>
      </div>
      <CapstoneManager me={user.id} initial={(sessions as any) || []} />
    </main>
  );
}
