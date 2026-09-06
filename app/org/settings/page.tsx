import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roleFor } from "@/lib/orgs";
import Logo from "@/components/Logo";
import HeaderNav from "@/components/HeaderNav";
import OrgSettingsClient from "@/components/OrgSettingsClient";
import { type BrandingOrg } from "@/components/OrgBrandingEditor";

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
    .select("id, slug, name, tagline, primary_color, logo_url, hero_image_url, about, highlights, faculty, presence_name, presence_voice")
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
        <p className="mt-1 text-sm text-slate2">Your landing page, the modules your members can use, and your AI provider.</p>
      </div>

      <Link href="/org/ads" className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4 transition hover:border-ai/40 hover:shadow-sm">
        <span className="flex items-center gap-3">
          <span className="text-xl" aria-hidden>📣</span>
          <span>
            <span className="block text-sm font-bold text-ink">Program spotlights</span>
            <span className="block text-xs text-slate-500">Promote a program or event to your members, and track impressions, clicks, and interest.</span>
          </span>
        </span>
        <span className="shrink-0 text-sm font-semibold text-ai">Open →</span>
      </Link>

      {orgs.length === 0 ? (
        <div className="card p-8 text-center text-slate2">We couldn't load your organization. <Link href="/dashboard" className="text-sky hover:underline">Back to dashboard</Link>.</div>
      ) : (
        <OrgSettingsClient orgs={orgs} />
      )}
    </main>
  );
}
