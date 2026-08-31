import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roleFor } from "@/lib/orgs";
import Logo from "@/components/Logo";
import HeaderNav from "@/components/HeaderNav";
import OrgBrandingEditor, { type BrandingOrg } from "@/components/OrgBrandingEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Organization settings" };

// Directors edit their own org's branding (logo, hero, text, people) here — the
// superadmin-only console lives at /admin/orgs.
export default async function OrgSettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const r = await roleFor(user);
  if (r.directorOrgIds.length === 0) {
    if (r.superadmin) redirect("/admin/orgs"); // superadmins use the full console
    redirect("/dashboard");
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("organizations")
    .select("id, slug, name, tagline, primary_color, logo_url, hero_image_url, about, highlights, faculty")
    .in("id", r.directorOrgIds);
  const orgs = (data || []) as BrandingOrg[];

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Logo href="/dashboard" />
        <HeaderNav />
      </header>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Organization settings</h1>
        <p className="mt-1 text-sm text-slate2">Your organization's logo, hero image, and the text on its landing page.</p>
      </div>

      {orgs.length === 0 ? (
        <div className="card p-8 text-center text-slate2">We couldn't load your organization. <Link href="/dashboard" className="text-sky hover:underline">Back to dashboard</Link>.</div>
      ) : (
        <div className="space-y-10">
          {orgs.map((org) => (
            <div key={org.id}>
              {orgs.length > 1 && <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{org.name} · superadditive.app/{org.slug}</div>}
              <OrgBrandingEditor org={org} />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
