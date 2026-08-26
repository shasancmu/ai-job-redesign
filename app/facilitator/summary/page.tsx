import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { facilitatorAccess } from "@/lib/orgs";
import { buildCohortDeck, type PairedExercise } from "@/lib/cohortDeck";
import DeckPresenter from "@/components/DeckPresenter";

export const dynamic = "force-dynamic";

const PAIRED: Record<string, PairedExercise> = { job: "job", workflow: "workflow" };

// The auto-generated "what the room did" summary deck for a cohort's run of a
// paired exercise. Facilitator/director/superadmin only, scoped to their cohorts.
export default async function CohortSummary({
  searchParams,
}: {
  searchParams: { cohort?: string; exercise?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const access = await facilitatorAccess(user);
  if (!access.ok) redirect("/dashboard");

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return <Notice title="Not configured" body="The summary needs the SUPABASE_SERVICE_ROLE_KEY environment variable." cohort={null} />;
  }

  const cohort = searchParams.cohort || "";
  const exercise = PAIRED[searchParams.exercise || ""];
  if (!cohort || !exercise) redirect("/facilitator");

  // Scope: non-superadmins only their own / org cohorts.
  if (!access.superadmin) {
    const orgFilter = access.orgIds.length ? `,org_id.in.(${access.orgIds.join(",")})` : "";
    const { data: myClasses } = await admin.from("classes").select("code").or(`owner_id.eq.${user.id}${orgFilter}`);
    const allowed = (myClasses || []).map((c: any) => c.code);
    if (!allowed.includes(cohort)) redirect("/facilitator");
  }

  const { data: cls } = await admin.from("classes").select("name").eq("code", cohort).maybeSingle();
  const cohortName = (cls?.name as string) || cohort;

  const slides = await buildCohortDeck(admin, cohort, exercise, cohortName).catch(() => null);

  if (!slides || slides.length === 0) {
    return (
      <Notice
        title="Not enough to summarize yet"
        body={`No completed pairs found for this exercise in ${cohortName}. Once pairs finish and build their redesigns, the summary fills in.`}
        cohort={cohort}
      />
    );
  }

  return <DeckPresenter slides={slides} exitHref={`/facilitator?cohort=${encodeURIComponent(cohort)}`} />;
}

function Notice({ title, body, cohort }: { title: string; body: string; cohort: string | null }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <div className="text-4xl">🎓</div>
      <h1 className="mt-3 text-2xl font-bold text-ink">{title}</h1>
      <p className="mt-2 text-slate2">{body}</p>
      <Link href={cohort ? `/facilitator?cohort=${encodeURIComponent(cohort)}` : "/facilitator"} className="btn-primary mt-6">
        ← Back to the cohort
      </Link>
    </main>
  );
}
