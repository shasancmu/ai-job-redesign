import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import HeaderNav from "@/components/HeaderNav";
import { isAdmin } from "@/lib/admin";
import ClassManager from "@/components/ClassManager";

export const dynamic = "force-dynamic";

export default async function Classes() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.email)) redirect("/dashboard");

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <div className="flex items-center justify-between gap-3">
        <Link href="/facilitator" className="text-sm text-slate2 hover:text-ink">← Facilitator</Link>
        <HeaderNav />
      </div>
      <h1 className="mt-1 text-2xl font-bold text-ink">Cohorts</h1>
      <p className="mb-6 text-slate2">
        Create a cohort, choose its modules, and share the link. Everyone who joins is grouped
        together, and their results roll up under one place.
      </p>
      <ClassManager />
    </main>
  );
}
