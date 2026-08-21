import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roleFor, getActiveOrg, normalizeRole, type OrgRole } from "@/lib/orgs";
import Logo from "@/components/Logo";
import HeaderNav from "@/components/HeaderNav";
import OrgSwitcher from "@/components/OrgSwitcher";
import TeamConsole from "@/components/TeamConsole";
import Tour from "@/components/Tour";

export const dynamic = "force-dynamic";

const TEAM_TOUR = [
  { sel: '[data-tour="team-add"]', title: "Add your people", body: "Invite anyone by email as a Member (a learner) or an Instructor. They join instantly if they already have an account, otherwise the moment they sign in." },
  { sel: '[data-tour="team-instructors"]', title: "Instructors run cohorts", body: "Instructors build and run their own cohorts and see only their group's learners. Promote a member to instructor, or add one above." },
  { sel: '[data-tour="team-members"]', title: "Your learners", body: "Everyone in your org lives here and belongs to your master cohort by default. Promote someone to instructor, or remove them, any time." },
  { sel: '[data-tour="team-cohorts"]', title: "Run cohorts & live activities", body: "Head to the cohort hub to create sections, run live activities, and review the room's work. You have instructor rights on every cohort in your org." },
];

export type TeamPerson = { userId: string; name: string; email: string; role: OrgRole };
export type TeamInvite = { email: string; role: OrgRole };

// The Director console: manage the people in YOUR org — nothing outside it.
export default async function TeamPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/team");

  const role = await roleFor(user);
  const directorOrgs = role.memberships.filter((m) => m.role === "director").map((m) => m.org);
  if (directorOrgs.length === 0) {
    // Superadmins manage orgs from the platform console; everyone else is out.
    redirect(role.superadmin ? "/admin/orgs" : "/dashboard");
  }

  // Show the active org if the director runs it, else their first.
  const active = await getActiveOrg(user).catch(() => null);
  const org = directorOrgs.find((o) => active && o.id === active.id) || directorOrgs[0];

  const admin = createAdminClient();
  const [{ data: memberRows }, { data: inviteRows }, { data: profs }] = await Promise.all([
    admin.from("org_members").select("user_id, org_role").eq("org_id", org.id),
    admin.from("org_invites").select("email, org_role").eq("org_id", org.id),
    admin.from("profiles").select("id, display_name"),
  ]);

  const memberIds = new Set((memberRows || []).map((m: any) => m.user_id));
  const nameById = new Map((profs || []).map((p: any) => [p.id, p.display_name]));
  const emailById = new Map<string, string>();
  // Emails come from auth; only keep this org's members (scoped).
  for (let page = 1; page <= 20; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    const list = data?.users || [];
    for (const u of list) if (memberIds.has(u.id)) emailById.set(u.id, (u.email || "").toLowerCase());
    if (list.length < 1000) break;
  }

  const people: TeamPerson[] = (memberRows || []).map((m: any) => {
    const email = emailById.get(m.user_id) || "";
    return { userId: m.user_id, email, name: nameById.get(m.user_id) || email.split("@")[0] || "Member", role: normalizeRole(m.org_role) };
  });
  people.sort((a, b) => a.name.localeCompare(b.name));

  const invitedEmails = new Set(people.map((p) => p.email));
  const invites: TeamInvite[] = (inviteRows || [])
    .map((i: any) => ({ email: i.email as string, role: normalizeRole(i.org_role) }))
    .filter((i: TeamInvite) => !invitedEmails.has(i.email)); // hide invites already turned into members

  const switcherOrgs = directorOrgs.map((o) => ({ slug: o.slug, name: o.name, logoUrl: o.logo_url, role: "director" }));

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-2">
          {directorOrgs.length > 1 && <OrgSwitcher orgs={switcherOrgs} activeSlug={org.slug} />}
          <HeaderNav tour />
        </div>
      </header>

      <div className="mb-6">
        <div className="text-sm font-medium text-slate-400">Your space on Superadditive</div>
        <h1 className="mt-0.5 text-3xl text-ink">{org.name}</h1>
        <p className="mt-1 max-w-lg text-sm text-slate2">
          You&apos;re the director of {org.name}&apos;s space here — manage its people, appoint instructors, and run cohorts. Only your members are shown.
        </p>
        <Link href="/facilitator" data-tour="team-cohorts" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-ink hover:text-sage">
          Manage cohorts &amp; run live activities <span aria-hidden>→</span>
        </Link>
      </div>

      {!org.dpa_accepted_at && (
        <Link href="/dpa" className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-amber/40 bg-amber-soft px-4 py-3 text-sm text-ink transition hover:border-amber">
          <span>Please review and accept your <b>Data Processing Agreement</b>.</span>
          <span className="shrink-0 font-medium text-amber">Review &amp; accept →</span>
        </Link>
      )}

      <TeamConsole orgId={org.id} people={people} invites={invites} />

      <Tour
        steps={TEAM_TOUR}
        storageKey="tour-team-v1"
        welcomeTitle={`${org.name} on Superadditive`}
        welcomeBody={`You run ${org.name}'s space on Superadditive — its people and cohorts. Here's a 30-second tour of what you manage.`}
      />
    </main>
  );
}
