import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, roleplayReply } from "@/lib/ai";
import { caseBySlug } from "@/lib/cases/registry";
import { loadLivingCase } from "@/lib/cases/store";
import { caseTutorSystem } from "@/lib/cases/tutor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Msg = { role: "user" | "assistant"; content: string };

// The case learning companion: a student asks a question about the case, and a
// tutor that knows the whole case answers openly to help them learn more. The
// genome is loaded server-side so the tutor has the full context.
export async function POST(request: Request) {
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const slug = String(body.slug || "").trim();
  const history: Msg[] = (Array.isArray(body.history) ? body.history : [])
    .filter((m: any) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string")
    .slice(-16)
    .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 1500) }));
  if (!slug || !history.length || history[history.length - 1].role !== "user") {
    return Response.json({ error: "Ask a question." }, { status: 400 });
  }

  const genome = caseBySlug(slug) || (await loadLivingCase(slug, user.id));
  if (!genome) return Response.json({ error: "Case not found." }, { status: 404 });

  setFlow("cases:ask");
  try {
    const reply = await roleplayReply(caseTutorSystem(genome), history, undefined, { low: true });
    return Response.json({ reply });
  } catch (e: any) {
    return Response.json({ error: e?.message || "The tutor didn't respond. Try again." }, { status: 500 });
  }
}
