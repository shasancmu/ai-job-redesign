import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import HeaderNav from "@/components/HeaderNav";
import Logo from "@/components/Logo";
import { roleFor } from "@/lib/orgs";
import { computeUsage, decayFlags, type ModuleKind } from "@/lib/mechanics/promotion";
import ReviewQueue from "@/components/ReviewQueue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The promotion review queue. Curators (superadmin) see global nominations and
// approved-global modules (with decay flags). Directors see org nominations for
// their orgs.
export const metadata = { title: "Review" };

export default async function ReviewPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const role = await roleFor(user);
  const isCurator = role.superadmin;
  const dirOrgs = role.directorOrgIds || [];
  if (!isCurator && dirOrgs.length === 0) redirect("/dashboard");

  const admin = createAdminClient();
  let rows: any[] = [];
  try {
    // Global queue (curators): pending globals + approved globals to watch.
    if (isCurator) {
      const { data } = await admin.from("module_promotions").select("*").eq("tier", "global").in("status", ["pending", "approved"]).order("created_at", { ascending: false });
      rows.push(...((data as any[]) || []));
    }
    // Org queue (directors): pending org nominations for their orgs.
    if (dirOrgs.length) {
      const { data } = await admin.from("module_promotions").select("*").eq("tier", "org").eq("status", "pending").in("org_id", dirOrgs).order("created_at", { ascending: false });
      rows.push(...((data as any[]) || []));
    }
  } catch { rows = []; }

  // Recompute decay flags for approved-global rows.
  rows = await Promise.all(rows.map(async (r) => {
    if (r.tier === "global" && r.status === "approved") {
      const u = await computeUsage(r.kind as ModuleKind, r.slug);
      return { ...r, decayFlags: decayFlags(u), readiness: { ...(r.readiness || {}), usage: u } };
    }
    return r;
  }));

  const pending = rows.filter((r) => r.status === "pending").length;

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between"><Logo href="/dashboard" /><div className="flex items-center gap-2"><Link href="/studio" className="text-sm text-slate2 hover:text-ink">← Studio</Link><HeaderNav /></div></header>
      <h1 className="text-3xl text-ink">Promotion review</h1>
      <p className="mt-1 max-w-2xl text-slate2">Modules default to Personal (the author's own classes). {isCurator ? "As a curator you approve Global (everywhere) promotions — only ones that already cleared the automated gates reach you — and can demote ones whose quality has slipped." : "As a director you approve Org-wide promotions for your organization."} {pending > 0 ? `${pending} awaiting a decision.` : ""}</p>
      <ReviewQueue initial={rows} />
    </main>
  );
}
