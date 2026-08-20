import { createClient } from "@/lib/supabase/server";
import { getMyOrgs, getActiveOrg, isSuperadmin } from "@/lib/orgs";
import OrgSwitcher from "@/components/OrgSwitcher";
import AccountMenu from "@/components/AccountMenu";

// The shared right-side header nav for signed-in pages other than the dashboard:
// the org switcher (when the user belongs to any org) plus the account menu.
// One place loads name + role + orgs, so every page's header stays identical.
export default async function HeaderNav({ showDashboard = true }: { showDashboard?: boolean }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [myOrgs, activeOrg, superadmin, profileRes] = await Promise.all([
    getMyOrgs(user.id),
    getActiveOrg(user),
    isSuperadmin(user),
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
  ]);
  const name = (profileRes.data as any)?.display_name || user.email?.split("@")[0] || "You";

  return (
    <div className="flex items-center gap-2">
      {myOrgs.length > 0 && (
        <OrgSwitcher
          orgs={myOrgs.map((m) => ({ slug: m.org.slug, name: m.org.name, logoUrl: m.org.logo_url, role: m.role }))}
          activeSlug={activeOrg?.slug || null}
        />
      )}
      <AccountMenu
        name={name}
        admin={superadmin}
        dashboard={showDashboard}
        tour={false}
        labels={{
          reports: "Reports",
          profile: "Profile",
          facilitator: "Facilitator",
          orgs: "Orgs",
          signOut: "Sign out",
          tour: "Take a tour",
        }}
      />
    </div>
  );
}
