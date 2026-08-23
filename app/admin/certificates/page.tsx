import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperadmin } from "@/lib/orgs";
import Logo from "@/components/Logo";
import HeaderNav from "@/components/HeaderNav";
import CertificatesManager from "@/components/CertificatesManager";
import { BUNDLES } from "@/lib/credentials";

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

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("bundles")
    .select("*")
    .is("org_id", null)
    .order("created_at", { ascending: true });

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
        </p>
      </div>

      <CertificatesManager scope="global" bundles={(rows as any[]) || []} />

      <section className="mt-10">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Built-in certificates</h2>
        <p className="mt-1 text-sm text-slate-400">Shipped in the product. Shown for reference; edit these in code.</p>
        <div className="mt-3 space-y-2">
          {BUNDLES.map((b) => (
            <div key={b.key} className="rounded-xl border border-line bg-mist/30 p-3">
              <div className="text-sm font-semibold text-ink">{b.name}</div>
              <div className="mt-0.5 text-xs text-slate-500">
                Core: {b.core.join(", ")} · Electives (choose {b.electivesNeeded}): {b.electives.join(", ")}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
