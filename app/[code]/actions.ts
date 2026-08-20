"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgBySlug, ACTIVE_ORG_COOKIE, normalizeRole, joinMasterCohort } from "@/lib/orgs";

// Enter a white-label org: ensure the user is allowed (member, invited, or the
// org is open), create the membership if needed, mark it the active org, and
// send them into the branded app.
export async function enterOrg(slug: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/${slug}`);

  const org = await getOrgBySlug(slug);
  if (!org) redirect("/dashboard");

  const admin = createAdminClient();
  const email = (user.email || "").toLowerCase();
  const { data: mem } = await admin.from("org_members").select("org_id").eq("org_id", org.id).eq("user_id", user.id).maybeSingle();
  const { data: inv } = await admin.from("org_invites").select("org_role").eq("org_id", org.id).eq("email", email).maybeSingle();

  const allowed = !!mem || !!inv || !org.invite_only;
  if (!allowed) redirect(`/${slug}`); // back to the invite-only screen

  if (!mem) {
    // Honor the invite's role (director/instructor); open-org joiners are members.
    await admin.from("org_members").upsert(
      { org_id: org.id, user_id: user.id, org_role: inv ? normalizeRole((inv as any).org_role) : "member" },
      { onConflict: "org_id,user_id", ignoreDuplicates: true }
    );
  }
  await joinMasterCohort(user.id, org); // everyone in the org is in its master cohort
  cookies().set(ACTIVE_ORG_COOKIE, org.slug, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  redirect("/dashboard");
}
