import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { facilitatorAccess } from "@/lib/orgs";
import HeaderNav from "@/components/HeaderNav";
import Logo from "@/components/Logo";
import { isAdmin } from "@/lib/admin";
import ShowcaseManager from "@/components/ShowcaseManager";

export const dynamic = "force-dynamic";

export const metadata = { title: "Showcase" };

export default async function FacilitatorShowcase() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await facilitatorAccess(user)).ok) redirect("/dashboard");

  const { data: sessions } = await supabase
    .from("showcase_sessions")
    .select("id, code, title, status, created_at")
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
      <h1 className="text-3xl text-ink">Showcase</h1>
      <p className="mt-1 text-slate2">
        Load your line-up of short presentations. Step through them back to back on the shared screen; the room gives feedback on each from their phones; every presenter walks away with an AI summary of their feedback.
      </p>
      <div className="mt-6">
        <ShowcaseManager me={user.id} initial={(sessions as any) || []} />
      </div>
    </main>
  );
}
