import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasAccess } from "@/lib/entitlement";
import Room from "@/components/Room";
import WorkflowRoom from "@/components/WorkflowRoom";

export default async function RoomPage({
  params,
}: {
  params: { code: string };
}) {
  const code = params.code.toUpperCase();
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login`);

  // Hard gate: unpaid users go to the paywall (dormant if Stripe isn't set up).
  if (!(await hasAccess(supabase, user.id))) redirect("/paywall");

  let { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (!session) redirect("/dashboard");

  const amHost = session.host_id === user.id;
  const amGuest = session.guest_id === user.id;

  // Allow joining directly from a shared room URL.
  if (!amHost && !amGuest) {
    if (session.guest_id) redirect("/dashboard"); // room full
    const { error } = await supabase
      .from("sessions")
      .update({ guest_id: user.id, status: "active" })
      .eq("id", session.id)
      .is("guest_id", null);
    if (error) redirect("/dashboard");
    session = { ...session, guest_id: user.id, status: "active" };
  }

  const ids = [session.host_id, session.guest_id].filter(Boolean);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, job_title, job_description")
    .in("id", ids as string[]);

  // ---- Workflow exercise: one shared canvas ----
  if (session.exercise === "workflow") {
    await supabase
      .from("workflow_docs")
      .upsert({ session_id: session.id }, { onConflict: "session_id" });
    const { data: doc } = await supabase
      .from("workflow_docs")
      .select("*")
      .eq("session_id", session.id)
      .maybeSingle();
    return (
      <WorkflowRoom
        me={user.id}
        initialSession={session}
        initialDoc={doc || { session_id: session.id }}
        initialProfiles={profiles || []}
      />
    );
  }

  // ---- Job exercise (default): each partner has their own workspace ----
  await supabase
    .from("workspaces")
    .upsert(
      { session_id: session.id, author_id: user.id },
      { onConflict: "session_id,author_id" }
    );

  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("*")
    .eq("session_id", session.id);

  return (
    <Room
      me={user.id}
      initialSession={session}
      initialWorkspaces={workspaces || []}
      initialProfiles={profiles || []}
    />
  );
}
