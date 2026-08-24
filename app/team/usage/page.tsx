import HeaderNav from "@/components/HeaderNav";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roleFor, getActiveOrg } from "@/lib/orgs";
import AdminUsage from "@/components/AdminUsage";
import Logo from "@/components/Logo";

export const dynamic = "force-dynamic";

// Usage, scoped to ONE organization: only the members of an org this person
// DIRECTS. Directors get their own org's activity; the platform-wide view at
// /admin/usage stays superadmin-only. All filtering is server-side, so one
// org can never read another org's users.
export default async function TeamUsagePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const role = await roleFor(user);
  if (role.directorOrgIds.length === 0) redirect("/dashboard");

  // The org in view must be one this user directs — never trust anything else.
  const active = await getActiveOrg(user);
  const org = active && role.directorOrgIds.includes(active.id)
    ? active
    : role.memberships.find((m) => m.role === "director")?.org || null;
  if (!org || !role.directorOrgIds.includes(org.id)) redirect("/dashboard");

  let sessions: { h: string; ex: string; st: string; at: string; code: string }[] = [];
  const names: Record<string, string> = {};
  const emails: Record<string, string> = {};
  const joined: Record<string, string> = {};
  let memberIds: string[] = [];
  let ready = false;

  try {
    const admin = createAdminClient();

    // The org's members — the ONLY users this page may touch.
    const idSet = new Set<string>();
    const { data: members } = await admin.from("org_members").select("user_id").eq("org_id", org.id);
    for (const m of members || []) if ((m as any).user_id) idSet.add((m as any).user_id);
    memberIds = [...idSet];

    if (memberIds.length > 0) {
      // Sessions for members only.
      for (let from = 0; ; from += 1000) {
        const { data, error } = await admin
          .from("sessions")
          .select("host_id, exercise, status, created_at, code")
          .in("host_id", memberIds)
          .order("created_at", { ascending: true })
          .range(from, from + 999);
        if (error || !data || data.length === 0) break;
        for (const s of data) sessions.push({ h: s.host_id, ex: s.exercise, st: s.status, at: s.created_at, code: s.code });
        if (data.length < 1000) break;
      }

      const { data: profiles } = await admin.from("profiles").select("id, display_name").in("id", memberIds);
      for (const p of profiles || []) if ((p as any).display_name) names[(p as any).id] = (p as any).display_name;

      // Emails + join dates: scan auth users, keep only members, stop once found.
      let found = 0;
      for (let page = 1; page <= 50 && found < idSet.size; page++) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        if (error || !data?.users?.length) break;
        for (const u of data.users) {
          if (!idSet.has(u.id)) continue;
          if (u.email) emails[u.id] = u.email;
          if (u.created_at) joined[u.id] = u.created_at;
          found++;
        }
        if (data.users.length < 1000) break;
      }
    }
    ready = true;
  } catch {
    ready = false;
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Logo href="/dashboard" />
        <HeaderNav />
      </header>
      <h1 className="text-2xl font-bold text-ink">Usage</h1>
      <p className="mt-1 text-sm text-slate-500">Activity for members of <span className="font-semibold text-ink">{org.name}</span> only. {memberIds.length} member{memberIds.length === 1 ? "" : "s"}.</p>

      {!ready ? (
        <div className="mt-6 rounded-xl bg-mist px-4 py-5 text-sm text-slate2">Couldn&apos;t load usage. The service-role key must be set for this page.</div>
      ) : (
        <div className="mt-6"><AdminUsage sessions={sessions} names={names} emails={emails} allUserIds={memberIds} joined={joined} /></div>
      )}
    </main>
  );
}
