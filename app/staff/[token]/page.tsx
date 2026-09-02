import { redirect } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgById, joinMasterCohort } from "@/lib/orgs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function Shell({ title, body, cta }: { title: string; body: string; cta?: { href: string; label: string } }) {
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center px-6 text-center">
      <Logo />
      <h1 className="mt-6 text-xl font-bold text-ink">{title}</h1>
      <p className="mt-2 text-sm text-slate2">{body}</p>
      {cta && <Link href={cta.href} className="btn-primary mt-6">{cta.label}</Link>}
    </main>
  );
}

// Redeem a staff invite link: whoever opens it (signed in, matching the optional
// email domain) becomes an instructor of the org.
export const metadata = { title: "Staff invite" };

export default async function StaffInvite({ params }: { params: { token: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/staff/${params.token}`);

  const admin = createAdminClient();
  const { data: link } = await admin.from("staff_invite_links").select("org_id, role, domain, active").eq("token", params.token).maybeSingle();
  if (!link || !(link as any).active) {
    return <Shell title="This link isn't active" body="It may have been turned off, or the link is wrong. Ask whoever shared it for a fresh one." cta={{ href: "/dashboard", label: "Go to dashboard" }} />;
  }
  const org = await getOrgById((link as any).org_id);
  if (!org) return <Shell title="Organization not found" body="This invite points to an organization that no longer exists." cta={{ href: "/dashboard", label: "Go to dashboard" }} />;

  const email = (user.email || "").toLowerCase();
  const domain = (link as any).domain as string | null;
  if (domain && !email.endsWith("@" + domain)) {
    return <Shell title={`This link is for ${domain} emails`} body={`You're signed in as ${email || "another address"}. Sign in with your ${domain} address to join ${org.name} as an instructor.`} cta={{ href: "/dashboard", label: "Go to dashboard" }} />;
  }

  const role = (link as any).role === "director" ? "director" : "instructor";
  await admin.from("org_members").upsert({ org_id: org.id, user_id: user.id, org_role: role }, { onConflict: "org_id,user_id" });
  await joinMasterCohort(user.id, org);

  return <Shell title={`You're an instructor at ${org.name}`} body="You can now create classes and cohorts, and run modules with your groups." cta={{ href: "/studio", label: "Go to the Studio" }} />;
}
