import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperadmin } from "@/lib/orgs";
import { AI_ENABLED } from "@/lib/ai";
import { agentModules, pickStaleModules, runAgentOnModule } from "@/lib/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Run the self-improvement agent over one module or a small batch of the most
// stale ones. Superadmin only (it spends AI). Runs in parallel to fit the window.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isSuperadmin(user))) return NextResponse.json({ error: "Superadmin only." }, { status: 403 });
  if (!AI_ENABLED) return NextResponse.json({ error: "AI is not configured." }, { status: 400 });

  let body: any = {};
  try { body = await request.json(); } catch { /* defaults */ }
  const role = String(body.role || "learner");
  const admin = createAdminClient();

  let targets: { slug: string; name: string; what: string }[];
  if (body.slug) {
    const m = agentModules().find((x) => x.slug === String(body.slug));
    targets = m ? [m] : [];
  } else {
    const n = Math.max(1, Math.min(5, Number(body.count) || 3));
    targets = await pickStaleModules(admin, role, n);
  }
  if (!targets.length) return NextResponse.json({ error: "No modules to run." }, { status: 400 });

  const notes = await Promise.all(targets.map((m) => runAgentOnModule(admin, m, role).catch(() => null)));
  return NextResponse.json({ ok: true, ran: notes.filter(Boolean).length, notes: notes.filter(Boolean) });
}
