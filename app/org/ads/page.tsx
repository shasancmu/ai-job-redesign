import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roleFor } from "@/lib/orgs";
import { listOrgAds, adStatsByAd, interestedMembers } from "@/lib/ads";
import Logo from "@/components/Logo";
import HeaderNav from "@/components/HeaderNav";
import AdsAdmin from "@/components/AdsAdmin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Program spotlights" };

// A director promotes a program or event to their members with a module-shaped
// card, and sees how it performs. Superadmins use the full org console.
export default async function OrgAdsPage() {
  const { data: { user } } = await createClient().auth.getUser();
  if (!user) redirect("/login");
  const r = await roleFor(user);
  if (r.directorOrgIds.length === 0) redirect(r.superadmin ? "/admin/orgs" : "/dashboard");

  const orgId = r.directorOrgIds[0];
  let orgName = "";
  try { const { data } = await createAdminClient().from("organizations").select("name").eq("id", orgId).maybeSingle(); orgName = (data as any)?.name || ""; } catch { /* none */ }

  const ads = await listOrgAds(orgId);
  const stats = await adStatsByAd(orgId);
  const interested: Record<string, { name: string; at: string }[]> = {};
  for (const ad of ads) if ((stats[ad.id]?.interest || 0) > 0) interested[ad.id] = await interestedMembers(ad.id);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-2"><Link href="/org/settings" className="text-sm text-slate2 hover:text-ink">← Organization</Link><HeaderNav /></div>
      </header>

      <div className="mb-2">
        <h1 className="text-2xl font-bold text-ink">Program spotlights</h1>
        <p className="mt-1 text-sm text-slate2">Promote a program or event to {orgName || "your members"} with a card that looks like a module. It links to a page here on the app, and you see impressions, clicks, and who&apos;s interested.</p>
      </div>

      <AdsAdmin orgId={orgId} initialAds={ads} stats={stats} interested={interested} />
    </main>
  );
}
