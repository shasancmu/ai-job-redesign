import HeaderNav from "@/components/HeaderNav";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperadmin } from "@/lib/orgs";
import Logo from "@/components/Logo";
import OrgAdmin from "@/components/OrgAdmin";

export const dynamic = "force-dynamic";

export default async function OrgsAdminPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await isSuperadmin(user))) redirect("/dashboard");

  const admin = createAdminClient();
  const [{ data: orgs }, { data: invites }, { data: members }, { data: profs }] = await Promise.all([
    admin.from("organizations").select("*").order("created_at", { ascending: false }),
    admin.from("org_invites").select("org_id, email, org_role"),
    admin.from("org_members").select("org_id, org_role"),
    admin.from("profiles").select("id, display_name"),
  ]);

  // Every account in the system, for the facilitator/member lookup. Names come
  // from profiles; the email is the auth record.
  const nameById = new Map((profs || []).map((p: any) => [p.id, p.display_name]));
  const users: { id: string; email: string; name: string }[] = [];
  for (let page = 1; page <= 20; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    const list = data?.users || [];
    for (const u of list) {
      const email = (u.email || "").toLowerCase();
      if (!email) continue;
      users.push({ id: u.id, email, name: nameById.get(u.id) || (u.user_metadata?.display_name as string) || email.split("@")[0] });
    }
    if (list.length < 1000) break;
  }
  users.sort((a, b) => a.name.localeCompare(b.name));

  // Count facilitators/members per org for the overview.
  const counts: Record<string, { facilitators: number; members: number }> = {};
  for (const m of members || []) {
    const c = (counts[m.org_id] ||= { facilitators: 0, members: 0 });
    if (m.org_role === "director" || m.org_role === "facilitator") c.facilitators++; else c.members++;
  }
  const invitesByOrg: Record<string, { email: string; org_role: string }[]> = {};
  for (const i of invites || []) (invitesByOrg[i.org_id] ||= []).push({ email: i.email, org_role: i.org_role });

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Logo href="/dashboard" />
        <HeaderNav />
      </header>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">White-label organizations</h1>
        <Link href="/admin/dropoff" className="text-sm font-medium text-ai hover:underline">Module drop-off →</Link>
      </div>
      <p className="mt-1 text-sm text-slate-500">Create a branded org (superadditive.app/slug), assign a facilitator, and invite members. Only you can see this.</p>

      <div className="mt-6">
        <OrgAdmin orgs={(orgs as any) || []} counts={counts} invitesByOrg={invitesByOrg} users={users} />
      </div>
    </main>
  );
}
