import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasModuleAccess } from "@/lib/entitlement";
import { hasClassAccess } from "@/lib/classes";
import { isAdmin } from "@/lib/admin";
import { moduleByExercise } from "@/lib/modules";
import Room from "@/components/Room";
import WorkflowRoom from "@/components/WorkflowRoom";
import SoloRoom from "@/components/SoloRoom";
import BenchmarkRoom from "@/components/BenchmarkRoom";
import NetworkRoom from "@/components/NetworkRoom";
import SoloWorkflowRoom from "@/components/SoloWorkflowRoom";

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

  let { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (!session) redirect("/dashboard");

  // Module gate: you need access to THIS session's module (dormant if Stripe
  // isn't set up). Instructors always pass.
  const mod = moduleByExercise(session.exercise || "job");
  if (
    mod &&
    !(await hasModuleAccess(supabase, user.id, mod.slug, isAdmin(user.email))) &&
    !(await hasClassAccess(supabase, user.id, session.cohort, mod.slug))
  ) {
    redirect(`/paywall?module=${mod.slug}`);
  }

  const amHost = session.host_id === user.id;
  const amGuest = session.guest_id === user.id;

  // Benchmark: single-user timed test, only the host belongs here.
  if (session.exercise === "benchmark") {
    if (!amHost) redirect("/dashboard");
    // In-class only: an untagged run would aggregate into one global bucket.
    if (!session.cohort) redirect("/dashboard");
    return <BenchmarkRoom me={user.id} session={session} />;
  }

  // Network survey: single-user, only the host belongs here.
  if (session.exercise === "network") {
    if (!amHost) redirect("/dashboard");
    if (!session.cohort) redirect("/dashboard");
    return <NetworkRoom me={user.id} session={session} />;
  }

  // Solo workflow (AI): single-user, only the host belongs here.
  if (session.exercise === "workflow-solo") {
    if (!amHost) redirect("/dashboard");
    await supabase
      .from("workflow_docs")
      .upsert({ session_id: session.id }, { onConflict: "session_id" });
    const { data: doc } = await supabase
      .from("workflow_docs")
      .select("*")
      .eq("session_id", session.id)
      .maybeSingle();
    return (
      <SoloWorkflowRoom
        me={user.id}
        session={session}
        initialDoc={doc || { session_id: session.id }}
      />
    );
  }

  // Solo (AI partner): single-user, only the host belongs here.
  if (session.exercise === "solo") {
    if (!amHost) redirect("/dashboard");
    await supabase
      .from("workspaces")
      .upsert(
        { session_id: session.id, author_id: user.id },
        { onConflict: "session_id,author_id" }
      );
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("*")
      .eq("session_id", session.id)
      .eq("author_id", user.id)
      .maybeSingle();
    return (
      <SoloRoom
        me={user.id}
        initialSession={session}
        initialWorkspace={workspace || { session_id: session.id, author_id: user.id }}
      />
    );
  }

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
