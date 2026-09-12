import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roleFor } from "@/lib/orgs";
import { recentAuditForOrg, type AuditRow } from "@/lib/audit";
import Logo from "@/components/Logo";
import HeaderNav from "@/components/HeaderNav";

export const dynamic = "force-dynamic";
export const metadata = { title: "Activity log" };

// Plain-English label for each dotted audit action.
const ACTION_LABEL: Record<string, string> = {
  "module.publish": "Published a module",
  "module.update": "Updated a module",
  "module.localize": "Published a language copy",
  "org.delete": "Deleted an organization",
  "org.branding.update": "Changed org branding",
  "data.export": "Exported their data",
  "account.delete": "Deleted their account",
  "scim.user.provision": "Provisioned a member (SCIM)",
  "scim.user.deactivate": "Deactivated a member (SCIM)",
  "scim.token.rotate": "Rotated the SCIM token",
  "sso.login": "Signed in via SSO",
  "study.create": "Created a study",
  "study.randomize": "Froze study randomization",
  "study.status": "Changed study status",
  "study.prereg": "Pre-registered a study plan",
  "calibration.rate": "Rated a run (L2 calibration)",
};
function label(action: string) {
  return ACTION_LABEL[action] || action;
}
function when(at: string) {
  try { return new Date(at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }); }
  catch { return at; }
}

// Directors review their org's security-relevant activity here: who published or
// changed a module, who exported data, membership changes from SSO/SCIM. Read-only.
export default async function OrgAuditPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const r = await roleFor(user);
  if (r.directorOrgIds.length === 0 && !r.superadmin) redirect("/dashboard");

  const admin = createAdminClient();
  const { data: orgRows } = await admin
    .from("organizations")
    .select("id, name")
    .in("id", r.directorOrgIds.length ? r.directorOrgIds : ["00000000-0000-0000-0000-000000000000"]);
  const orgName = new Map((orgRows || []).map((o: any) => [o.id, o.name]));

  // One org → its rows; several → merge and sort. Superadmin with no org sees nothing here (they have /admin).
  const perOrg = await Promise.all(r.directorOrgIds.map((id) => recentAuditForOrg(id, 200).then((rows) => rows.map((x) => ({ ...x, orgId: id })))));
  const rows: (AuditRow & { orgId: string })[] = perOrg.flat().sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 300);
  const multiOrg = r.directorOrgIds.length > 1;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Logo href="/dashboard" />
        <HeaderNav />
      </header>

      <div className="mb-6">
        <Link href="/org/settings" className="text-xs text-slate-500 hover:underline">← Organization settings</Link>
        <h1 className="mt-2 text-2xl font-bold text-ink">Activity log</h1>
        <p className="mt-1 text-sm text-slate2">A record of security-relevant actions in your organization: modules published or changed, data exports, and membership changes. Read-only.</p>
      </div>

      {rows.length === 0 ? (
        <div className="card p-8 text-center text-slate2">No activity yet.</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-semibold">When</th>
                <th className="px-4 py-3 font-semibold">Who</th>
                <th className="px-4 py-3 font-semibold">Action</th>
                <th className="px-4 py-3 font-semibold">Target</th>
                {multiOrg && <th className="px-4 py-3 font-semibold">Org</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => (
                <tr key={`${x.orgId}-${x.id}`} className="border-b border-line/60 last:border-0 align-top">
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-500">{when(x.at)}</td>
                  <td className="px-4 py-3 text-ink">{x.actor_email || "—"}</td>
                  <td className="px-4 py-3 text-ink">{label(x.action)}</td>
                  <td className="px-4 py-3 text-slate2 break-all">{x.target || "—"}</td>
                  {multiOrg && <td className="px-4 py-3 text-slate-500">{orgName.get(x.orgId) || "—"}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
