import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { moduleRunAccess } from "@/lib/access";
import { isAdmin } from "@/lib/admin";
import { moduleByExercise } from "@/lib/modules";
import { isDirectorOrAdmin } from "@/lib/orgs";
import Room from "@/components/Room";
import WorkflowRoom from "@/components/WorkflowRoom";
import SoloRoom from "@/components/SoloRoom";
import BenchmarkRoom from "@/components/BenchmarkRoom";
import NetworkRoom from "@/components/NetworkRoom";
import SoloWorkflowRoom from "@/components/SoloWorkflowRoom";
import CanvasRoom from "@/components/CanvasRoom";
import NegotiationRoom from "@/components/NegotiationRoom";
import HardConvoRoom from "@/components/HardConvoRoom";
import EarningsRoom from "@/components/EarningsRoom";
import HotSeatRoom from "@/components/HotSeatRoom";
import CareerRoom from "@/components/CareerRoom";
import CareerRoadmapRoom from "@/components/CareerRoadmapRoom";
import ConsultRoom from "@/components/ConsultRoom";
import SuperpowerRoom from "@/components/SuperpowerRoom";
import BoardRoom from "@/components/BoardRoom";
import VoiceConsultRoom from "@/components/VoiceConsultRoom";
import VisionRoom from "@/components/VisionRoom";
import VoiceVisionRoom from "@/components/VoiceVisionRoom";
import DisclosureRoom from "@/components/DisclosureRoom";
import EmpathyRoom from "@/components/EmpathyRoom";
import ResumeRoom from "@/components/ResumeRoom";
import VoiceResumeRoom from "@/components/VoiceResumeRoom";
import MyopiaRoom from "@/components/MyopiaRoom";
import PersonalNetworkRoom from "@/components/PersonalNetworkRoom";
import DomainBriefRoom from "@/components/DomainBriefRoom";
import FindCollaboratorsRoom from "@/components/FindCollaboratorsRoom";
import LicensingBriefRoom from "@/components/LicensingBriefRoom";
import ScoreInventionRoom from "@/components/ScoreInventionRoom";
import DefenseImpactRoom from "@/components/DefenseImpactRoom";
import ExplainRoom from "@/components/ExplainRoom";
import ImpactOptimizerRoom from "@/components/ImpactOptimizerRoom";
import PositionResearchRoom from "@/components/PositionResearchRoom";
import RankDisclosuresRoom from "@/components/RankDisclosuresRoom";
import FindCofounderRoom from "@/components/FindCofounderRoom";
import DiligenceScienceRoom from "@/components/DiligenceScienceRoom";
import DomainScanRoom from "@/components/DomainScanRoom";
import { SCAN_VARIANTS } from "@/lib/scanVariants";
import RegressionRoom from "@/components/RegressionRoom";
import StarHireRoom from "@/components/StarHireRoom";
import PipelineRoom from "@/components/PipelineRoom";
import PaperStudyRoom from "@/components/PaperStudyRoom";
import InteractionRoom from "@/components/InteractionRoom";
import ExperimentRoom from "@/components/ExperimentRoom";
import Lesson1Rules from "@/components/lessons/Lesson1Rules";
import Lesson2Learning from "@/components/lessons/Lesson2Learning";
import Lesson3Language from "@/components/lessons/Lesson3Language";
import Lesson4Scale from "@/components/lessons/Lesson4Scale";
import PhdLesson1What from "@/components/lessons/PhdLesson1What";
import PhdLesson2Choose from "@/components/lessons/PhdLesson2Choose";
import PhdLesson3Apply from "@/components/lessons/PhdLesson3Apply";
import PhdLesson4Structure from "@/components/lessons/PhdLesson4Structure";
import PhdLesson5Succeed from "@/components/lessons/PhdLesson5Succeed";
import PhdLesson6Placement from "@/components/lessons/PhdLesson6Placement";
import { variantForExercise } from "@/lib/disclosure";
import { canvasByExercise } from "@/lib/canvases";
import { resolveCanvasDefForUser } from "@/lib/customModules";
import { scenarioByExercise } from "@/lib/negotiation";

// A room code says nothing about what's in the tab, and people keep several
// open at once — so name the exercise. One indexed lookup on a single column,
// and it degrades to the generic title when the session isn't readable.
export async function generateMetadata({ params }: { params: { code: string } }) {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("sessions")
      .select("exercise")
      .eq("code", params.code.toUpperCase())
      .maybeSingle();
    // Same default the page applies, but only once a row actually came back —
    // a missing session shouldn't get named after the job module.
    const mod = data ? moduleByExercise(data.exercise || "job") : null;
    if (mod) return { title: mod.name };
  } catch {
    /* fall through to the generic title */
  }
  return { title: "Exercise" };
}

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
    const { data: netProf } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
    return <NetworkRoom me={user.id} session={session} myName={(netProf as any)?.display_name || ""} />;
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

  // Map Your Personal Network: single-user, host only.
  if (session.exercise === "personal-network") {
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
    return <PersonalNetworkRoom me={user.id} session={session} initialWorkspace={workspace || { session_id: session.id, author_id: user.id }} />;
  }

  // Domain Expertise Brief (Scientifiq): single-user, host only.
  if (session.exercise === "domain-brief") {
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
    return <DomainBriefRoom session={session} initialWorkspace={workspace || { session_id: session.id, author_id: user.id }} />;
  }

  // Find Collaborators / Licensing Brief (Scientifiq): single-user, host only.
  if (session.exercise === "collaborators" || session.exercise === "licensing-brief") {
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
    const iw = workspace || { session_id: session.id, author_id: user.id };
    return session.exercise === "collaborators"
      ? <FindCollaboratorsRoom session={session} initialWorkspace={iw} />
      : <LicensingBriefRoom session={session} initialWorkspace={iw} />;
  }

  // Impact Optimizer: needs the director flag (to allow the defense target). Host only.
  if (session.exercise === "optimize") {
    if (!amHost) redirect("/dashboard");
    await supabase.from("workspaces").upsert({ session_id: session.id, author_id: user.id }, { onConflict: "session_id,author_id" });
    const { data: workspace } = await supabase.from("workspaces").select("*").eq("session_id", session.id).eq("author_id", user.id).maybeSingle();
    const iw = workspace || { session_id: session.id, author_id: user.id };
    return <ImpactOptimizerRoom session={session} initialWorkspace={iw} canDefense={await isDirectorOrAdmin(user)} />;
  }

  // Scientifiq abstract-scoring family (score/defense/explain/position/rank). Host only.
  if (["score-invention", "defense-impact", "explain", "position-research", "rank-disclosures"].includes(session.exercise || "")) {
    if (!amHost) redirect("/dashboard");
    // Defense Impact is director-only.
    if (session.exercise === "defense-impact" && !(await isDirectorOrAdmin(user))) redirect("/dashboard");
    await supabase.from("workspaces").upsert({ session_id: session.id, author_id: user.id }, { onConflict: "session_id,author_id" });
    const { data: workspace } = await supabase.from("workspaces").select("*").eq("session_id", session.id).eq("author_id", user.id).maybeSingle();
    const iw = workspace || { session_id: session.id, author_id: user.id };
    if (session.exercise === "defense-impact") return <DefenseImpactRoom session={session} initialWorkspace={iw} />;
    if (session.exercise === "explain") return <ExplainRoom session={session} initialWorkspace={iw} />;
    if (session.exercise === "position-research") return <PositionResearchRoom session={session} initialWorkspace={iw} />;
    if (session.exercise === "rank-disclosures") return <RankDisclosuresRoom session={session} initialWorkspace={iw} />;
    return <ScoreInventionRoom session={session} initialWorkspace={iw} />;
  }

  // Scientifiq people family (technical co-founder, science diligence). Host only.
  if (["find-cofounder", "diligence-science"].includes(session.exercise || "")) {
    if (!amHost) redirect("/dashboard");
    await supabase.from("workspaces").upsert({ session_id: session.id, author_id: user.id }, { onConflict: "session_id,author_id" });
    const { data: workspace } = await supabase.from("workspaces").select("*").eq("session_id", session.id).eq("author_id", user.id).maybeSingle();
    const iw = workspace || { session_id: session.id, author_id: user.id };
    return session.exercise === "diligence-science"
      ? <DiligenceScienceRoom session={session} initialWorkspace={iw} />
      : <FindCofounderRoom session={session} initialWorkspace={iw} />;
  }

  // Star Hire: single-user, host only. Interrogate AI candidates over a hidden
  // human-capital truth (sealed in the workspace), then hire and get graded.
  if (session.exercise === "star-hire") {
    if (!amHost) redirect("/dashboard");
    await supabase.from("workspaces").upsert({ session_id: session.id, author_id: user.id }, { onConflict: "session_id,author_id" });
    const { data: workspace } = await supabase.from("workspaces").select("*").eq("session_id", session.id).eq("author_id", user.id).maybeSingle();
    return <StarHireRoom me={user.id} session={session} initialWorkspace={workspace || { session_id: session.id, author_id: user.id }} />;
  }

  // Regression Detective: single-user, host only. Simulated stats console over a
  // hidden data-generating process; the sealed answer key rides in the workspace.
  if (session.exercise === "regression-detective") {
    if (!amHost) redirect("/dashboard");
    await supabase.from("workspaces").upsert({ session_id: session.id, author_id: user.id }, { onConflict: "session_id,author_id" });
    const { data: workspace } = await supabase.from("workspaces").select("*").eq("session_id", session.id).eq("author_id", user.id).maybeSingle();
    return <RegressionRoom me={user.id} session={session} initialWorkspace={workspace || { session_id: session.id, author_id: user.id }} />;
  }

  // Scientifiq landscape family (four domain scans, one shared room). Host only.
  if (["tech-landscape", "deal-sourcing", "commercialization-scorecard", "field-trajectory"].includes(session.exercise || "")) {
    if (!amHost) redirect("/dashboard");
    await supabase.from("workspaces").upsert({ session_id: session.id, author_id: user.id }, { onConflict: "session_id,author_id" });
    const { data: workspace } = await supabase.from("workspaces").select("*").eq("session_id", session.id).eq("author_id", user.id).maybeSingle();
    const iw = workspace || { session_id: session.id, author_id: user.id };
    return <DomainScanRoom session={session} initialWorkspace={iw} variant={SCAN_VARIANTS[session.exercise!]} />;
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

  // Research: Publication Pipeline (simulation) and Understand a Paper. Host only.
  if (session.exercise === "pipeline" || session.exercise === "paper-study") {
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
    const iw = workspace || { session_id: session.id, author_id: user.id };
    return session.exercise === "pipeline" ? (
      <PipelineRoom me={user.id} session={session} initialWorkspace={iw} />
    ) : (
      <PaperStudyRoom me={user.id} session={session} initialWorkspace={iw} />
    );
  }

  // "How AI works" lessons — interactive teaching, no workspace needed. Host only.
  if (["ai-rules", "ai-learning", "ai-language", "ai-scale"].includes(session.exercise || "")) {
    if (!amHost) redirect("/dashboard");
    const Lesson =
      session.exercise === "ai-rules" ? Lesson1Rules :
      session.exercise === "ai-learning" ? Lesson2Learning :
      session.exercise === "ai-language" ? Lesson3Language : Lesson4Scale;
    return <Lesson me={user.id} session={session} initialWorkspace={null} />;
  }

  // The PhD path — explainer lessons. Host only.
  if (["phd-what", "phd-choose", "phd-apply", "phd-structure", "phd-succeed", "phd-placement"].includes(session.exercise || "")) {
    if (!amHost) redirect("/dashboard");
    const Lesson =
      session.exercise === "phd-what" ? PhdLesson1What :
      session.exercise === "phd-choose" ? PhdLesson2Choose :
      session.exercise === "phd-apply" ? PhdLesson3Apply :
      session.exercise === "phd-structure" ? PhdLesson4Structure :
      session.exercise === "phd-succeed" ? PhdLesson5Succeed : PhdLesson6Placement;
    return <Lesson me={user.id} session={session} initialWorkspace={null} />;
  }

  // The Anatomy of an Idea: bespoke interaction-plot room. Host only.
  if (session.exercise === "interaction") {
    if (!amHost) redirect("/dashboard");
    await supabase.from("workspaces").upsert({ session_id: session.id, author_id: user.id }, { onConflict: "session_id,author_id" });
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("*")
      .eq("session_id", session.id)
      .eq("author_id", user.id)
      .maybeSingle();
    return <InteractionRoom me={user.id} session={session} initialWorkspace={workspace || { session_id: session.id, author_id: user.id }} />;
  }

  // The Strategy Experiment: design the 8-part canvas, then simulate it in silico.
  if (session.exercise === "field-experiment") {
    if (!amHost) redirect("/dashboard");
    await supabase.from("workspaces").upsert({ session_id: session.id, author_id: user.id }, { onConflict: "session_id,author_id" });
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("*")
      .eq("session_id", session.id)
      .eq("author_id", user.id)
      .maybeSingle();
    return <ExperimentRoom me={user.id} session={session} initialWorkspace={workspace || { session_id: session.id, author_id: user.id }} />;
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

  // Vision (typed) and Talk Through Your Vision (voice): single-user, host only.
  if (session.exercise === "vision" || session.exercise === "vision-voice") {
    if (!amHost) redirect("/dashboard");
    await supabase.from("workspaces").upsert({ session_id: session.id, author_id: user.id }, { onConflict: "session_id,author_id" });
    const { data: workspace } = await supabase.from("workspaces").select("*").eq("session_id", session.id).eq("author_id", user.id).maybeSingle();
    const ws = workspace || { session_id: session.id, author_id: user.id };
    return session.exercise === "vision-voice"
      ? <VoiceVisionRoom me={user.id} session={session} initialWorkspace={ws} />
      : <VisionRoom me={user.id} session={session} initialWorkspace={ws} />;
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

  // Overcoming Myopia (business or career): solo, host only. Same engine, domain
  // decided by the exercise.
  if (session.exercise === "myopia-business" || session.exercise === "myopia-career") {
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
      <MyopiaRoom
        session={session}
        initialWorkspace={workspace || { session_id: session.id, author_id: user.id }}
        domain={session.exercise === "myopia-career" ? "career" : "business"}
      />
    );
  }

  // Refresh Your Résumé (text or voice): solo, host only. Prefill the résumé
  // from a prior Career X-ray or an earlier refresh so they don't re-paste.
  if (session.exercise === "resume" || session.exercise === "resume-voice") {
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

    let prefill = "";
    let prefillFrom = "";
    if (!(workspace?.canvas as any)?.source?.text) {
      const { data: sess } = await supabase
        .from("sessions")
        .select("id, exercise, created_at")
        .eq("host_id", user.id)
        .in("exercise", ["career-xray", "resume", "resume-voice"])
        .neq("id", session.id)
        .order("created_at", { ascending: false })
        .limit(10);
      const ids = (sess || []).map((s: any) => s.id);
      if (ids.length) {
        const { data: wss } = await supabase.from("workspaces").select("session_id, canvas").in("session_id", ids).eq("author_id", user.id);
        const byId = new Map((wss || []).map((w: any) => [w.session_id, w.canvas]));
        for (const s of sess || []) {
          const c = (byId.get(s.id) as any) || {};
          const text = s.exercise === "career-xray" ? c.text || "" : c.source?.text || "";
          if (text && text.trim().length > 80) {
            prefill = text;
            prefillFrom = s.exercise === "career-xray" ? "your Career X-ray" : "a previous résumé refresh";
            break;
          }
        }
      }
    }

    const initialWorkspace = workspace || { session_id: session.id, author_id: user.id };
    return session.exercise === "resume-voice" ? (
      <VoiceResumeRoom session={session} initialWorkspace={initialWorkspace} prefill={prefill} prefillFrom={prefillFrom} />
    ) : (
      <ResumeRoom session={session} initialWorkspace={initialWorkspace} prefill={prefill} prefillFrom={prefillFrom} />
    );
  }

  // Understand Your Customer: the owner-side room. Potential customers do the
  // AI empathy interview via the shared public link; only the owner sees this.
  if (session.exercise === "empathy") {
    if (!amHost) redirect("/dashboard");
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
      <EmpathyRoom
        session={session}
        token={token}
        initialWorkspace={workspace || { session_id: session.id, author_id: user.id }}
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

  // Hard-conversation rehearsal: single-user, only the host belongs here.
  if (session.exercise === "hard-convo") {
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
      <HardConvoRoom
        me={user.id}
        session={session}
        initialWorkspace={workspace || { session_id: session.id, author_id: user.id }}
      />
    );
  }

  if (session.exercise === "earnings-call") {
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
      <EarningsRoom
        me={user.id}
        session={session}
        initialWorkspace={workspace || { session_id: session.id, author_id: user.id }}
      />
    );
  }

  if (session.exercise === "hot-seat") {
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
      <HotSeatRoom
        me={user.id}
        session={session}
        initialWorkspace={workspace || { session_id: session.id, author_id: user.id }}
      />
    );
  }

  // Strategy-canvas modules (GAS / opportunity-capability / experiment):
  // single-user, only the host belongs here.
  const canvasDef = await resolveCanvasDefForUser(session.exercise || "", user.id);
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
