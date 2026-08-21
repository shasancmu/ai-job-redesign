import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { boardMember, type BoardEntry } from "@/lib/board";
import { canvasByExercise } from "@/lib/canvases";
import ConsultReport from "@/components/ConsultReport";
import VisionReport from "@/components/VisionReport";
import SuperpowerReport from "@/components/SuperpowerReport";
import PersonalNetworkReport from "@/components/PersonalNetworkReport";
import DomainBriefReport from "@/components/DomainBriefReport";
import CollaboratorsReport from "@/components/CollaboratorsReport";
import LicensingBriefReport from "@/components/LicensingBriefReport";
import ResumeReport from "@/components/ResumeReport";
import MyopiaReport from "@/components/MyopiaReport";
import BoardVerdict from "@/components/BoardVerdict";
import CareerXrayView from "@/components/CareerXrayView";
import CareerRoadmapView from "@/components/CareerRoadmapView";
import PlanView from "@/components/PlanView";
import CanvasView from "@/components/CanvasView";
import WorkflowPlanView from "@/components/WorkflowPlanView";
import EmpathyAggregate from "@/components/EmpathyAggregate";
import Logo from "@/components/Logo";
import type { Metadata } from "next";
import { loadReportPreview } from "@/lib/reportPreview";

export const dynamic = "force-dynamic";

// Per-report social preview: a real title + one-line summary (the OG image comes
// from opengraph-image.tsx in this segment, so a shared link previews richly).
export async function generateMetadata({ params }: { params: { token: string } }): Promise<Metadata> {
  const p = await loadReportPreview(params.token).catch(() => null);
  const title = p ? p.title : "A shared report";
  const description = p?.summary || "A result made with Superadditive, AI for business strategy and innovation.";
  return {
    title,
    description,
    openGraph: { title, description, type: "article" },
    twitter: { card: "summary_large_image", title, description },
    robots: { index: false, follow: false }, // shared links are private, not for search
  };
}

// PUBLIC, no-auth: a read-only view of a report the owner chose to share. Looked
// up by an unguessable token via the service-role client. Sharing is opt-in (the
// token is only minted when the owner taps Share). Intake links (empathy
// interview, vendor disclosure) use public_token for a different purpose, so
// those never render here; the empathy REPORT uses its own canvas reportToken.
export default async function SharedReport({ params }: { params: { token: string } }) {
  const token = params.token;
  let node: any = null;

  try {
    const admin = createAdminClient();

    // 1) Empathy aggregate: its own token, stored on the owner's workspace canvas.
    const { data: ews } = await admin.from("workspaces").select("canvas").eq("canvas->>reportToken", token).limit(1).maybeSingle();
    const eCanvas = (ews?.canvas as any) || {};
    if (eCanvas.aggregate) {
      node = (
        <>
          <Head eyebrow="Customer research" title="What customers told us" />
          <EmpathyAggregate a={eCanvas.aggregate} />
        </>
      );
    }

    // 2) Otherwise a session report by public_token (never an intake-link exercise).
    if (!node) {
      const { data: s } = await admin.from("sessions").select("id, exercise, host_id").eq("public_token", token).maybeSingle();
      const ex = s?.exercise || "";
      const INTAKE = ex === "empathy" || ex === "disclosure" || ex === "disclosure-haip";
      if (s && !INTAKE) node = await renderSession(admin, s);
    }
  } catch {
    /* service role not set, or bad token */
  }

  if (!node) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <Logo />
        <h1 className="mt-8 text-2xl font-bold text-ink">This report isn&apos;t available</h1>
        <p className="mt-2 text-slate2">The link may be old, or the report was never shared. Ask whoever sent it for a fresh link.</p>
        <Link href="/" className="btn-primary mt-6 text-sm">Explore Superadditive →</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <Logo />
        <span className="no-print rounded-full bg-mist px-3 py-1 text-xs font-semibold text-slate2">Shared with you</span>
      </header>
      {node}
      <div className="no-print mt-12 border-t border-line pt-6 text-center">
        <p className="text-sm text-slate-400">Made with Superadditive, AI for business strategy and innovation.</p>
        <Link href="/" className="btn-ghost mt-2 inline-block text-sm">Try it yourself →</Link>
      </div>
    </main>
  );
}

function Head({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-6">
      <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">{eyebrow}</div>
      <h1 className="mt-1 text-3xl text-ink">{title}</h1>
    </div>
  );
}

async function renderSession(admin: any, s: any) {
  const ex: string = s.exercise;

  // Workflow plan lives in its own table.
  if (ex === "workflow" || ex === "workflow-solo") {
    const { data: doc } = await admin.from("workflow_docs").select("*").eq("session_id", s.id).maybeSingle();
    const analysis = (doc?.analysis as any) || {};
    if (!doc || !(analysis.summary || analysis.flow?.length || (doc.steps || []).length)) return null;
    return <WorkflowPlanView doc={doc} embedded />;
  }

  const { data: ws } = await admin.from("workspaces").select("canvas, plan").eq("session_id", s.id).eq("author_id", s.host_id).maybeSingle();
  const canvas = (ws?.canvas as any) || {};

  if (ex === "vision" || ex === "vision-voice") {
    if (!canvas.report) return null;
    return (
      <>
        <Head eyebrow="Company vision" title={canvas.intake?.name || "Our vision"} />
        <VisionReport report={canvas.report} org={canvas.intake?.name} />
      </>
    );
  }

  if (ex === "consult" || ex === "voice-consult") {
    if (!canvas.report) return null;
    return (
      <>
        <Head eyebrow="The 30-Minute Consult" title={canvas.intake?.name || "Business consult"} />
        <ConsultReport report={canvas.report} wms={canvas.wmsScore} />
      </>
    );
  }

  if (ex === "superpower") {
    if (!canvas.report) return null;
    return (
      <>
        <Head eyebrow="Find Your Superpower" title="A superpower profile" />
        <SuperpowerReport report={canvas.report} />
      </>
    );
  }

  if (ex === "personal-network") {
    if (!canvas.report) return null;
    return (
      <>
        <Head eyebrow="Map Your Personal Network" title="A personal network map" />
        <PersonalNetworkReport report={canvas.report} metrics={canvas.metrics} contacts={canvas.contacts || []} ties={canvas.ties || {}} />
      </>
    );
  }

  if (ex === "domain-brief") {
    if (!canvas.brief || !canvas.data) return null;
    return (
      <>
        <Head eyebrow="Domain Expertise Brief" title={canvas.data.domain ? `${canvas.data.domain} · ${canvas.data.scopeLabel}` : "Domain expertise"} />
        <DomainBriefReport brief={canvas.brief} data={canvas.data} />
      </>
    );
  }

  if (ex === "collaborators") {
    if (!canvas.report) return null;
    return (
      <>
        <Head eyebrow="Find Collaborators" title="Complementary collaborators" />
        <CollaboratorsReport report={canvas.report} scopeLabel={canvas.scopeLabel} />
      </>
    );
  }

  if (ex === "licensing-brief") {
    if (!canvas.brief) return null;
    return (
      <>
        <Head eyebrow="Licensing Brief" title={canvas.title || "Licensing brief"} />
        <LicensingBriefReport brief={canvas.brief} scores={canvas.scores} comparables={canvas.comparables || []} patents={canvas.patents || []} title={canvas.title} />
      </>
    );
  }

  if (ex === "resume" || ex === "resume-voice") {
    if (!canvas.report) return null;
    return (
      <>
        <Head eyebrow="Refresh Your Résumé" title="Résumé changes" />
        <ResumeReport report={canvas.report} />
      </>
    );
  }

  if (ex === "myopia-business" || ex === "myopia-career") {
    if (!canvas.report) return null;
    return (
      <>
        <Head eyebrow="Overcoming Myopia" title={ex === "myopia-career" ? "Career blind spots" : "Business blind spots"} />
        <MyopiaReport report={canvas.report} subjectWord={ex === "myopia-career" ? "career" : "business"} />
      </>
    );
  }

  if (ex === "board") {
    if (!canvas.verdict) return null;
    const transcript: BoardEntry[] = canvas.transcript || [];
    return (
      <>
        <Head eyebrow="Your AI Board" title={canvas.decision || "A decision"} />
        <BoardVerdict verdict={canvas.verdict} />
        {transcript.length > 0 && (
          <div className="mt-8">
            <h2 className="eyebrow mb-3">The debate</h2>
            <div className="space-y-3">
              {transcript.map((e, i) => {
                if (e.who === "you") {
                  return (
                    <div key={i} className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl bg-ink px-4 py-2.5 text-sm text-white">{e.text}</div>
                    </div>
                  );
                }
                const m = boardMember(e.who);
                if (!m) return null;
                return (
                  <div key={i} className="rounded-2xl border border-line bg-white p-4" style={{ borderLeftWidth: 3, borderLeftColor: m.dot }}>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: m.dot }} />
                      <span className="text-sm font-bold text-ink">{m.name}</span>
                      <span className="text-xs text-slate-400">{m.role}</span>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{e.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </>
    );
  }

  if (ex === "career-xray" || ex === "jd-xray") {
    if (!canvas.xray) return null;
    return <CareerXrayView xray={canvas.xray} mode={canvas.mode || (ex === "jd-xray" ? "jd" : "resume")} embedded />;
  }

  if (ex === "career-roadmap") {
    const roadmap = canvas.roadmap;
    if (!roadmap || !Array.isArray(roadmap.targets) || roadmap.targets.length === 0) return null;
    return (
      <>
        <Head eyebrow="Career roadmap" title="A path for the next moves" />
        <CareerRoadmapView roadmap={roadmap} />
      </>
    );
  }

  if (ex === "solo") {
    const plan = (ws as any)?.plan;
    if (!plan || !(plan.headline || plan.summary || (plan.human?.length || 0) + (plan.ai?.length || 0) > 0)) return null;
    return <PlanView plan={plan} embedded />;
  }

  const def = canvasByExercise(ex);
  if (def) {
    const hasContent = canvas.synthesis || canvas.verdict || Object.values(canvas.fields || {}).some((v: any) => (Array.isArray(v) ? v.length : v));
    if (!hasContent) return null;
    return <CanvasView def={def} canvas={canvas} embedded />;
  }

  return null;
}
