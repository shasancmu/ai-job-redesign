import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { boardMember, type BoardEntry } from "@/lib/board";
import ConsultReport from "@/components/ConsultReport";
import SuperpowerReport from "@/components/SuperpowerReport";
import BoardVerdict from "@/components/BoardVerdict";
import Logo from "@/components/Logo";

export const dynamic = "force-dynamic";

// PUBLIC, no-auth: a read-only view of a report the owner chose to share. Looked
// up by the session's unguessable public_token via the service-role client.
// Sharing is opt-in (the token is only minted when the owner taps Share).
export default async function SharedReport({ params }: { params: { token: string } }) {
  const token = params.token;
  let session: any = null;
  let canvas: any = {};
  try {
    const admin = createAdminClient();
    const { data: s } = await admin.from("sessions").select("id, exercise, host_id").eq("public_token", token).maybeSingle();
    session = s;
    if (session) {
      const { data: w } = await admin.from("workspaces").select("canvas").eq("session_id", session.id).eq("author_id", session.host_id).maybeSingle();
      canvas = (w?.canvas as any) || {};
    }
  } catch {
    /* service role not set */
  }

  const body = session ? renderReport(session.exercise, canvas) : null;

  if (!body) {
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
        <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-slate2">Shared with you</span>
      </header>
      {body}
      <div className="mt-12 border-t border-line pt-6 text-center">
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

function renderReport(exercise: string, canvas: any) {
  if (exercise === "consult" || exercise === "voice-consult") {
    if (!canvas.report) return null;
    return (
      <>
        <Head eyebrow="The 30-Minute Consult" title={canvas.intake?.name || "Business consult"} />
        <ConsultReport report={canvas.report} wms={canvas.wmsScore} />
      </>
    );
  }

  if (exercise === "superpower") {
    if (!canvas.report) return null;
    return (
      <>
        <Head eyebrow="Find Your Superpower" title="A superpower profile" />
        <SuperpowerReport report={canvas.report} />
      </>
    );
  }

  if (exercise === "board") {
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

  return null;
}
