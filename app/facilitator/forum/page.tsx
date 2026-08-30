import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { facilitatorAccess } from "@/lib/orgs";
import HeaderNav from "@/components/HeaderNav";
import { isAdmin } from "@/lib/admin";
import ForumManager from "@/components/ForumManager";

export const dynamic = "force-dynamic";

export default async function FacilitatorForum() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await facilitatorAccess(user)).ok) redirect("/dashboard");

  const { data: sessions } = await supabase
    .from("forum_sessions")
    .select("id, code, topic, status, created_at")
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
        <h1 className="mt-1 text-3xl text-ink">Open floor</h1>
        <p className="mt-1 text-slate2">
          A massive open group chat the whole room joins by code, no accounts. Everyone talks at once, and an AI reads
          the entire thread live on the shared screen: where the room lands, where it splits, and a verdict.
        </p>
      </div>
      <ForumManager me={user.id} initial={(sessions as any) || []} />
    </main>
  );
}
