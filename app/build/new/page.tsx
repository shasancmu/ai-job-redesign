import HeaderNav from "@/components/HeaderNav";
import Logo from "@/components/Logo";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { roleFor } from "@/lib/orgs";
import ModuleBuilder from "@/components/ModuleBuilder";
import { DEFAULT_SPEC } from "@/lib/moduleBuilder";

export const dynamic = "force-dynamic";

export default async function NewModulePage({ searchParams }: { searchParams: { type?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const role = await roleFor(user);
  if (!(role.superadmin || role.directorOrgIds.length > 0)) redirect("/dashboard");
  const dirOrg = role.memberships.find((m) => m.role === "director")?.org;
  const type = searchParams.type;
  const seeded = (type === "report" || type === "scorecard" || type === "verdict") ? { ...DEFAULT_SPEC, superType: type as typeof DEFAULT_SPEC.superType } : undefined;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Logo href="/dashboard" />
        <HeaderNav />
      </header>
      <div className="mb-6">
        <Link href="/build" className="text-sm text-slate2 hover:text-ink">← Your modules</Link>
        <h1 className="mt-1 text-2xl font-bold text-ink">Build a module</h1>
        <p className="mt-1 text-sm text-slate-500">Fill in the questions and the report sections. AI runs the interview and writes the report, no code.</p>
      </div>
      <ModuleBuilder canGlobal={role.superadmin} orgName={dirOrg?.name || null} initialSpec={seeded} />
    </main>
  );
}
