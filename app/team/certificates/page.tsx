import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roleFor, getActiveOrg } from "@/lib/orgs";
import Logo from "@/components/Logo";
import HeaderNav from "@/components/HeaderNav";
import OrgSwitcher from "@/components/OrgSwitcher";
import CertificatesManager from "@/components/CertificatesManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Certificates" };

// Director console: certificates this org awards its members.
export default async function OrgCertificatesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/team/certificates");

  const role = await roleFor(user);
  const directorOrgs = role.memberships.filter((m) => m.role === "director").map((m) => m.org);
  if (directorOrgs.length === 0) redirect(role.superadmin ? "/admin/certificates" : "/dashboard");

  const active = await getActiveOrg(user).catch(() => null);
  const org = directorOrgs.find((o) => active && o.id === active.id) || directorOrgs[0];

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("bundles")
    .select("*")
    .eq("org_id", org.id)
    .order("created_at", { ascending: true });

  const switcherOrgs = directorOrgs.map((o) => ({ slug: o.slug, name: o.name, logoUrl: o.logo_url, role: "director" }));

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-2">
          {directorOrgs.length > 1 && <OrgSwitcher orgs={switcherOrgs} activeSlug={org.slug} />}
          <HeaderNav />
        </div>
      </header>

      <div className="mb-6">
        <Link href="/team" className="text-sm text-slate2 hover:text-ink">&larr; {org.name}</Link>
        <h1 className="mt-1 text-3xl text-ink">Certificates</h1>
        <p className="mt-1 max-w-lg text-sm text-slate2">
          Define certificates your members earn by completing a bundle of modules (core plus a choice of electives). Only {org.name}&apos;s
          members see and earn these.
        </p>
      </div>

      <CertificatesManager scope="org" orgId={org.id} bundles={(rows as any[]) || []} />
    </main>
  );
}
