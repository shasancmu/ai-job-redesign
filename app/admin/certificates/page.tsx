import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperadmin } from "@/lib/orgs";
import Logo from "@/components/Logo";
import HeaderNav from "@/components/HeaderNav";
import CertificatesManager from "@/components/CertificatesManager";
import { BUNDLES, seedBuiltinBundles } from "@/lib/credentials";

export const dynamic = "force-dynamic";
export const metadata = { title: "Certificates" };

// Superadmin console: platform-wide certificates (available to everyone).
export default async function AdminCertificatesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await isSuperadmin(user))) redirect("/dashboard");

  // Seed the built-in defaults as editable rows (once), then list all global
  // bundles — the six defaults plus any custom ones.
  const admin = createAdminClient();
  let rows: any[] = [];
  let dbOk = true;
  try {
    await seedBuiltinBundles(admin);
    const { data } = await admin
      .from("bundles")
      .select("*")
      .is("org_id", null)
      .order("created_at", { ascending: true });
    rows = data || [];
  } catch {
    dbOk = false;
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Logo href="/dashboard" />
        <HeaderNav />
      </header>

      <div className="mb-6">
        <Link href="/admin/orgs" className="text-sm text-slate2 hover:text-ink">&larr; Admin</Link>
        <h1 className="mt-1 text-3xl text-ink">Certificates</h1>
        <p className="mt-1 max-w-xl text-sm text-slate2">
          Platform-wide certificates, earned by anyone who completes the bundle. Each is a set of modules (core plus a choice of electives).
          The six defaults are editable here; your edits override the shipped versions.
        </p>
      </div>

      {dbOk ? (
        <CertificatesManager scope="global" bundles={rows} builtinKeys={BUNDLES.map((b) => b.key)} />
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-amber/40 bg-amber-soft p-3 text-sm text-ink">
            Apply the <b>bundles</b> table migration to manage certificates here. The built-in defaults below are active in the meantime.
          </div>
          {BUNDLES.map((b) => (
            <div key={b.key} className="rounded-xl border border-line bg-mist/30 p-3">
              <div className="text-sm font-semibold text-ink">{b.name}</div>
              <div className="mt-0.5 text-xs text-slate-500">
                Core: {b.core.join(", ")} · Electives (choose {b.electivesNeeded}): {b.electives.join(", ")}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
