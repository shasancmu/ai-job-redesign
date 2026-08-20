import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import HeaderNav from "@/components/HeaderNav";
import { isAdmin } from "@/lib/admin";
import CloudManager from "@/components/CloudManager";

export const dynamic = "force-dynamic";

export default async function FacilitatorCloud() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.email)) redirect("/dashboard");

  const { data: clouds } = await supabase
    .from("cloud_sessions")
    .select("id, code, question, status, created_at")
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
        <h1 className="mt-1 text-3xl font-bold text-ink">Live Word Cloud</h1>
        <p className="mt-1 text-slate2">
          Ask the room a question. They answer from their phones (no sign-in); the cloud builds live, then AI
          summarizes what everyone said.
        </p>
      </div>
      <CloudManager me={user.id} initial={(clouds as any) || []} />
    </main>
  );
}
