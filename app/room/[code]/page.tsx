import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { moduleRunAccess } from "@/lib/access";
import { isAdmin } from "@/lib/admin";
import { moduleByExercise } from "@/lib/modules";
import Room from "@/components/Room";
import WorkflowRoom from "@/components/WorkflowRoom";
import SoloRoom from "@/components/SoloRoom";
import BenchmarkRoom from "@/components/BenchmarkRoom";
import NetworkRoom from "@/components/NetworkRoom";
import SoloWorkflowRoom from "@/components/SoloWorkflowRoom";
import CanvasRoom from "@/components/CanvasRoom";
import NegotiationRoom from "@/components/NegotiationRoom";
import CareerRoom from "@/components/CareerRoom";
import CareerRoadmapRoom from "@/components/CareerRoadmapRoom";
import ConsultRoom from "@/components/ConsultRoom";
import SuperpowerRoom from "@/components/SuperpowerRoom";
import BoardRoom from "@/components/BoardRoom";
import VoiceConsultRoom from "@/components/VoiceConsultRoom";
import DisclosureRoom from "@/components/DisclosureRoom";
import { variantForExercise } from "@/lib/disclosure";
import { canvasByExercise } from "@/lib/canvases";
import { scenarioByExercise } from "@/lib/negotiation";

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
  if (mod) {
    const access = await moduleRunAccess(supabase, {
      userId: user.id,
      slug: mod.slug,
      exercise: session.exercise || "job",
      cohort: session.cohort,
      isAdmin: isAdmin(user.email),
    });
    if (!access.ok) redirect(`/paywall?module=${mod.slug}`);
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

  // Career X-ray (resume or JD exposure analysis): single-user, host only.
  if (session.exercise === "career-xray" || session.exercise === "jd-xray") {
    if (!amHost) redirect("/dashboard");
    await supabase
      .from("workspaces")
      .upsert({ session_id: session.id, author_id: user.id }, { onConflict: "session_id,author_id" });
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("*")
      .eq("session_id", session.id)
      .eq("author_id", user.id)
      .maybeSingle();
    const { data: prof } = await supabase.from("profiles").select("job_title, level").eq("id", user.id).maybeSingle();
    return (
      <CareerRoom
        me={user.id}
        session={session}
        mode={session.exercise === "jd-xray" ? "jd" : "resume"}
        initialWorkspace={workspace || { session_id: session.id, author_id: user.id }}
        savedRole={(prof as any)?.job_title || ""}
        savedLevel={(prof as any)?.level || ""}
      />
    );
  }

  // Career Roadmap: single-user, host only. Reuses the résumé from the most
  // recent Career/JD X-ray or prior Roadmap run, if any.
  if (session.exercise === "career-roadmap") {
    if (!amHost) redirect("/dashboard");
    await supabase
      .from("workspaces")
      .upsert({ session_id: session.id, author_id: user.id }, { onConflict: "session_id,author_id" });
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("*")
      .eq("session_id", session.id)
      .eq("author_id", user.id)
      .maybeSingle();

    let savedResume = (workspace?.canvas as any)?.text as string | undefined;
    if (!savedResume) {
      const { data: prior } = await supabase
        .from("sessions")
        .select("id, exercise, created_at")
        .eq("host_id", user.id)
        .in("exercise", ["career-xray", "jd-xray", "career-roadmap"])
        .neq("id", session.id)
        .order("created_at", { ascending: false })
        .limit(8);
      const ids = (prior || []).map((s: any) => s.id);
      if (ids.length) {
        const { data: wss } = await supabase
          .from("workspaces")
          .select("session_id, canvas")
          .in("session_id", ids)
          .eq("author_id", user.id);
        const byId: Record<string, any> = {};
        for (const w of wss || []) byId[w.session_id] = w;
        for (const s of prior || []) {
          const txt = byId[s.id]?.canvas?.text;
          if (typeof txt === "string" && txt.trim().length >= 60) { savedResume = txt; break; }
        }
      }
    }

    const { data: rmProf } = await supabase.from("profiles").select("job_title, level").eq("id", user.id).maybeSingle();
    return (
      <CareerRoadmapRoom
        me={user.id}
        session={session}
        initialWorkspace={workspace || { session_id: session.id, author_id: user.id }}
        savedResume={savedResume}
        savedRole={(rmProf as any)?.job_title || ""}
        savedLevel={(rmProf as any)?.level || ""}
      />
    );
  }

  // The 30-Minute Consult: single-user, host only. Guided business diagnostic.
  if (session.exercise === "consult") {
    if (!amHost) redirect("/dashboard");
    await supabase
      .from("workspaces")
      .upsert({ session_id: session.id, author_id: user.id }, { onConflict: "session_id,author_id" });
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("*")
      .eq("session_id", session.id)
      .eq("author_id", user.id)
      .maybeSingle();
    return <ConsultRoom me={user.id} session={session} initialWorkspace={workspace || { session_id: session.id, author_id: user.id }} />;
  }

  // Find Your Superpower: single-user, host only.
  if (session.exercise === "superpower") {
    if (!amHost) redirect("/dashboard");
    await supabase
      .from("workspaces")
      .upsert({ session_id: session.id, author_id: user.id }, { onConflict: "session_id,author_id" });
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("*")
      .eq("session_id", session.id)
      .eq("author_id", user.id)
      .maybeSingle();
    return <SuperpowerRoom me={user.id} session={session} initialWorkspace={workspace || { session_id: session.id, author_id: user.id }} />;
  }

  // Your AI Board: single-user, host only. A live advisory-board debate.
  if (session.exercise === "board") {
    if (!amHost) redirect("/dashboard");
    await supabase
      .from("workspaces")
      .upsert({ session_id: session.id, author_id: user.id }, { onConflict: "session_id,author_id" });
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("*")
      .eq("session_id", session.id)
      .eq("author_id", user.id)
      .maybeSingle();
    return <BoardRoom me={user.id} session={session} initialWorkspace={workspace || { session_id: session.id, author_id: user.id }} />;
  }

  // Talk Through Your Business: spoken voice interview, host only.
  if (session.exercise === "voice-consult") {
    if (!amHost) redirect("/dashboard");
    await supabase
      .from("workspaces")
      .upsert({ session_id: session.id, author_id: user.id }, { onConflict: "session_id,author_id" });
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("*")
      .eq("session_id", session.id)
      .eq("author_id", user.id)
      .maybeSingle();
    return <VoiceConsultRoom me={user.id} session={session} initialWorkspace={workspace || { session_id: session.id, author_id: user.id }} />;
  }

  // Vendor Disclosure (general or HAIP healthcare): buyer-side room. The vendor
  // fills the linked public form; only the buyer (host) sees this room.
  if (session.exercise === "disclosure" || session.exercise === "disclosure-haip") {
    if (!amHost) redirect("/dashboard");
    // Mint a long, unguessable public token for the vendor link (once).
    let token: string = session.public_token;
    if (!token) {
      token = (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, "");
      await supabase.from("sessions").update({ public_token: token }).eq("id", session.id);
    }
    await supabase
      .from("workspaces")
      .upsert({ session_id: session.id, author_id: user.id }, { onConflict: "session_id,author_id" });
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("*")
      .eq("session_id", session.id)
      .eq("author_id", user.id)
      .maybeSingle();
    return (
      <DisclosureRoom
        me={user.id}
        session={session}
        token={token}
        initialWorkspace={workspace || { session_id: session.id, author_id: user.id }}
        variant={variantForExercise(session.exercise)}
      />
    );
  }

  // Negotiation role-play (any scenario): single-user, only the host belongs here.
  if (scenarioByExercise(session.exercise || "")) {
    if (!amHost) redirect("/dashboard");
    await supabase
      .from("workspaces")
      .upsert({ session_id: session.id, author_id: user.id }, { onConflict: "session_id,author_id" });
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("*")
      .eq("session_id", session.id)
      .eq("author_id", user.id)
      .maybeSingle();
    return (
      <NegotiationRoom
        me={user.id}
        session={session}
        initialWorkspace={workspace || { session_id: session.id, author_id: user.id }}
      />
    );
  }

  // Strategy-canvas modules (GAS / opportunity-capability / experiment):
  // single-user, only the host belongs here.
  const canvasDef = canvasByExercise(session.exercise || "");
  if (canvasDef) {
    if (!amHost) redirect("/dashboard");
    await supabase
      .from("workspaces")
      .upsert({ session_id: session.id, author_id: user.id }, { onConflict: "session_id,author_id" });
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("*")
      .eq("session_id", session.id)
      .eq("author_id", user.id)
      .maybeSingle();
    return (
      <CanvasRoom
        me={user.id}
        session={session}
        def={canvasDef}
        initialWorkspace={workspace || { session_id: session.id, author_id: user.id }}
      />
    );
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
