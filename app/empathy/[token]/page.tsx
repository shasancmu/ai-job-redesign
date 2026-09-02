import { createAdminClient } from "@/lib/supabase/admin";
import EmpathyChat from "@/components/EmpathyChat";
import Logo from "@/components/Logo";

export const dynamic = "force-dynamic";

// PUBLIC, no-auth page: a potential customer opens the owner's shared link and
// has an AI-run empathy interview. Looked up by a long unguessable token through
// the service-role client (never RLS-exposed).
export const metadata = { title: "Customer interview" };

export default async function EmpathyPage({ params }: { params: { token: string } }) {
  const token = params.token;
  let session: any = null;
  let canvas: any = {};
  try {
    const admin = createAdminClient();
    const { data: s } = await admin.from("sessions").select("id, exercise").eq("public_token", token).maybeSingle();
    session = s;
    if (session) {
      const { data: w } = await admin.from("workspaces").select("canvas").eq("session_id", session.id).limit(1).maybeSingle();
      canvas = (w?.canvas as any) || {};
    }
  } catch {
    /* service role not set */
  }

  if (!session || session.exercise !== "empathy") {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <Logo />
        <h1 className="mt-8 text-2xl font-bold text-ink">This link isn&apos;t valid</h1>
        <p className="mt-2 text-slate2">Ask whoever sent it for a fresh interview link.</p>
      </main>
    );
  }

  const business = canvas.business || "";

  return (
    <EmpathyChat
      token={token}
      business={business}
    />
  );
}
