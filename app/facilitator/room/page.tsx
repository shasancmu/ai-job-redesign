import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { facilitatorAccess } from "@/lib/orgs";
import RoomIntel from "@/components/RoomIntel";

export const dynamic = "force-dynamic";

// Live Room Intelligence for a cohort. Facilitator/director/superadmin only,
// scoped to cohorts they manage.
export default async function RoomIntelPage({ searchParams }: { searchParams: { cohort?: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const access = await facilitatorAccess(user);
  if (!access.ok) redirect("/dashboard");

  const cohort = searchParams.cohort || "";
  if (!cohort) redirect("/facilitator");

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    redirect("/facilitator");
  }

  if (!access.superadmin) {
    const orgFilter = access.orgIds.length ? `,org_id.in.(${access.orgIds.join(",")})` : "";
    const { data: myClasses } = await admin.from("classes").select("code").or(`owner_id.eq.${user.id}${orgFilter}`);
    if (!((myClasses || []).map((c: any) => c.code).includes(cohort))) redirect("/facilitator");
  }

  const { data: cls } = await admin.from("classes").select("name").eq("code", cohort).maybeSingle();
  return <RoomIntel cohort={cohort} cohortName={(cls?.name as string) || cohort} />;
}
