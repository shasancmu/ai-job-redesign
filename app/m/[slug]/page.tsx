import { redirect } from "next/navigation";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";
import { recordModuleEvent } from "@/lib/moduleEvents";
import { getSpec, publicSpec } from "@/lib/mechanics/store";
import RoleplaySpecRoom from "@/components/RoleplaySpecRoom";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Run/preview any role-play module by slug. Only the client-safe view of the spec
// is sent; scenarios and answer keys stay on the server.
export const metadata = { title: "Role play" };

export default async function RunModule({ params, searchParams }: { params: { slug: string }; searchParams: { class?: string; cohort?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const cohort = searchParams.class || searchParams.cohort || "";
  if (!user) redirect(`/login?next=${encodeURIComponent(`/m/${params.slug}${cohort ? `?class=${cohort}` : ""}`)}`);
  await recordModuleEvent(params.slug, "roleplay", "start", user.id);

  const spec = await getSpec(params.slug);
  if (!spec || spec.mechanic !== "roleplay") {
    return (
      <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center px-6 text-center">
        <Logo />
        <h1 className="mt-6 text-xl font-bold text-ink">Module not found</h1>
        <p className="mt-2 text-sm text-slate2">This module doesn't exist or isn't a role-play module yet.</p>
      </main>
    );
  }
  return <RoleplaySpecRoom spec={publicSpec(spec)} cohort={cohort || undefined} />;
}
