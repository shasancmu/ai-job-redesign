import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import CapstoneBoard from "@/components/CapstoneBoard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The shared team room. Anyone with the code joins (students, no account). The
// signed-in host gets the phase controls.
export default async function CapstonePage({ params }: { params: { code: string } }) {
  const code = String(params.code || "").toUpperCase();

  let exists = false;
  let isHost = false;
  try {
    const admin = createAdminClient();
    const { data: session } = await admin.from("capstone_sessions").select("id, host_id").eq("code", code).maybeSingle();
    exists = !!session;
    if (session) {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      isHost = !!user && user.id === session.host_id;
    }
  } catch { exists = false; }

  if (!exists) {
    return (
      <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center px-6 text-center">
        <Logo />
        <h1 className="mt-6 text-xl font-bold text-ink">Team code not found</h1>
        <p className="mt-2 text-sm text-slate2">Check the code on the screen and try again.</p>
      </main>
    );
  }

  return <CapstoneBoard code={code} isHost={isHost} />;
}
