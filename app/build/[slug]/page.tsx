import HeaderNav from "@/components/HeaderNav";
import Logo from "@/components/Logo";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { roleFor } from "@/lib/orgs";
import { getModuleForEdit } from "@/lib/customModules";
import ModuleBuilder from "@/components/ModuleBuilder";
import { DEFAULT_SPEC } from "@/lib/moduleBuilder";

export const dynamic = "force-dynamic";

export const metadata = { title: "Edit module" };

export default async function EditModulePage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const role = await roleFor(user);
  if (!(role.superadmin || role.directorOrgIds.length > 0 || role.instructorOrgIds.length > 0)) redirect("/dashboard");

  const row = await getModuleForEdit(params.slug, user.id);
  if (!row) redirect("/build");
  const dirOrg = role.memberships.find((m) => m.role === "director")?.org;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Logo href="/dashboard" />
        <HeaderNav />
      </header>
      <div className="mb-6">
        <Link href="/build" className="text-sm text-slate2 hover:text-ink">← Your modules</Link>
        <h1 className="mt-1 text-2xl font-bold text-ink">Edit module</h1>
      </div>
      <ModuleBuilder initialSpec={{ ...DEFAULT_SPEC, ...row.spec }} editSlug={row.slug} canGlobal={role.superadmin} orgName={dirOrg?.name || null} />
    </main>
  );
}
