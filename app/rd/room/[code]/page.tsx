import { redirect } from "next/navigation";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";
import { getRedesignSpec, REDESIGN_PREFIX } from "@/lib/mechanics/redesignStore";
import RedesignRoom from "@/components/RedesignRoom";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Runtime for an authored paired redesign. Reuses the proven sessions +
// workspaces join path (cloned from app/room/[code]).
export default async function RedesignRoomPage({ params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let { data: session } = await supabase.from("sessions").select("*").eq("code", code).maybeSingle();
  if (!session || !String(session.exercise || "").startsWith(REDESIGN_PREFIX)) redirect("/dashboard");

  const spec = await getRedesignSpec(String(session.exercise).slice(REDESIGN_PREFIX.length));
  if (!spec) redirect("/dashboard");

  const amHost = session.host_id === user.id;
  const amGuest = session.guest_id === user.id;
  if (!amHost && !amGuest) {
    if (session.guest_id) redirect("/dashboard"); // room full
    const { error } = await supabase.from("sessions").update({ guest_id: user.id, status: "active" }).eq("id", session.id).is("guest_id", null);
    if (error) redirect("/dashboard");
    session = { ...session, guest_id: user.id, status: "active" };
  }

  await supabase.from("workspaces").upsert({ session_id: session.id, author_id: user.id }, { onConflict: "session_id,author_id" });
  const [{ data: workspaces }, { data: profiles }] = await Promise.all([
    supabase.from("workspaces").select("*").eq("session_id", session.id),
    supabase.from("profiles").select("id, display_name").in("id", [session.host_id, session.guest_id].filter(Boolean) as string[]),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-4"><Logo href="/dashboard" /></div>
      <RedesignRoom me={user.id} spec={spec} initialSession={session} initialWorkspaces={workspaces || []} initialProfiles={profiles || []} />
    </main>
  );
}
