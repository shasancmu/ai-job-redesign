import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMyOrgs, getActiveOrg, facilitatorAccess } from "@/lib/orgs";
import OrgSwitcher from "@/components/OrgSwitcher";
import AccountMenu from "@/components/AccountMenu";

// The shared right-side header nav for signed-in pages other than the dashboard:
// the org switcher (when the user belongs to any org) plus the account menu.
// One place loads name + role + orgs, so every page's header stays identical.
export default async function HeaderNav({ showDashboard = true, tour = false }: { showDashboard?: boolean; tour?: boolean }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [myOrgs, activeOrg, access, profileRes] = await Promise.all([
    getMyOrgs(user.id),
    getActiveOrg(user),
    facilitatorAccess(user),
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
  ]);
  const name = (profileRes.data as any)?.display_name || user.email?.split("@")[0] || "You";

  return (
    <div className="flex items-center gap-2">
      {showDashboard && (
        <Link
          href="/dashboard"
          title="Dashboard"
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-mist hover:text-ink"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 11.5 12 4l9 7.5" />
            <path d="M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9" />
          </svg>
          <span className="hidden sm:inline">Dashboard</span>
        </Link>
      )}
      {myOrgs.length > 0 && (
        <OrgSwitcher
          orgs={myOrgs.map((m) => ({ slug: m.org.slug, name: m.org.name, logoUrl: m.org.logo_url, role: m.role }))}
          activeSlug={activeOrg?.slug || null}
        />
      )}
      <AccountMenu
        name={name}
        facilitator={access.ok}
        director={access.orgIds.length > 0}
        superadmin={access.superadmin}
        dashboard={showDashboard}
        tour={tour}
        labels={{
          reports: "Reports",
          achievements: "Achievements",
          profile: "Profile",
          signOut: "Sign out",
          tour: "Take a tour",
        }}
      />
    </div>
  );
}
