import { redirect } from "next/navigation";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import CapstoneBoard from "@/components/CapstoneBoard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The shared team room. Everyone signs in (the cohort follows the sign-in); the
// captain who created the team gets the phase controls.
export default async function CapstonePage({ params }: { params: { code: string } }) {
  const code = String(params.code || "").toUpperCase();
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/capstone/${code}`);

  let session: { host_id: string; cohort: string | null } | null = null;
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("capstone_sessions").select("host_id, cohort").eq("code", code).maybeSingle();
    session = (data as any) || null;
  } catch { session = null; }

  if (!session) {
    return (
      <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center px-6 text-center">
        <Logo />
        <h1 className="mt-6 text-xl font-bold text-ink">Team code not found</h1>
        <p className="mt-2 text-sm text-slate2">Check the code your captain shared, or start a team.</p>
        <a href="/capstone" className="btn-primary mt-4 text-sm">Back to the lobby</a>
      </main>
    );
  }

  const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
  const myName = (profile?.display_name as string) || (user.user_metadata?.display_name as string) || user.email?.split("@")[0] || "";

  return <CapstoneBoard code={code} isHost={user.id === session.host_id} myName={myName} cohort={session.cohort || ""} userId={user.id} />;
}
