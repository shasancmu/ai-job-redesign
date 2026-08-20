import HeaderNav from "@/components/HeaderNav";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";
import AdminUsage from "@/components/AdminUsage";
import Logo from "@/components/Logo";

export const dynamic = "force-dynamic";

export default async function AdminUsagePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.email)) redirect("/dashboard");

  let sessions: { h: string; ex: string; st: string; at: string; code: string }[] = [];
  const names: Record<string, string> = {};
  const emails: Record<string, string> = {};
  const joined: Record<string, string> = {}; // account creation date
  const allUserIds: string[] = [];
  let ready = false;

  try {
    const admin = createAdminClient();

    for (let from = 0; from < 60000; from += 1000) {
      const { data, error } = await admin
        .from("sessions")
        .select("host_id, exercise, status, created_at, code")
        .order("created_at", { ascending: true })
        .range(from, from + 999);
      if (error || !data || data.length === 0) break;
      for (const s of data) sessions.push({ h: s.host_id, ex: s.exercise, st: s.status, at: s.created_at, code: s.code });
      if (data.length < 1000) break;
    }

    // EVERY account, not just those with activity, so signed-up-but-idle users show.
    for (let page = 1; page <= 50; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error || !data?.users?.length) break;
      for (const u of data.users) {
        allUserIds.push(u.id);
        if (u.email) emails[u.id] = u.email;
        if (u.created_at) joined[u.id] = u.created_at;
      }
      if (data.users.length < 1000) break;
    }

    const { data: profiles } = await admin.from("profiles").select("id, display_name");
    for (const p of profiles || []) if (p.display_name) names[p.id] = p.display_name;

    ready = true;
  } catch {
    ready = false;
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Logo />
        <HeaderNav />
      </header>
      <h1 className="text-2xl font-bold text-ink">Usage</h1>
      <p className="mt-1 text-sm text-slate-500">Who&apos;s using the platform, what they run, and how much they finish. Only you can see this.</p>

      {!ready ? (
        <div className="mt-6 rounded-xl bg-mist px-4 py-5 text-sm text-slate2">Couldn&apos;t load usage. The service-role key must be set for this page.</div>
      ) : (
        <div className="mt-6"><AdminUsage sessions={sessions} names={names} emails={emails} allUserIds={allUserIds} joined={joined} /></div>
      )}
    </main>
  );
}
