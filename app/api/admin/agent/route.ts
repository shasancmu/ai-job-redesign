import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperadmin } from "@/lib/orgs";
import { AI_ENABLED } from "@/lib/ai";
import { agentModules, runAgentPanel, claudeCodeBrief } from "@/lib/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Run the QA persona panel over ONE chosen module (all roles, in parallel). The
// console calls this per module when a set is selected, so each stays inside the
// time budget. Superadmin only (it spends AI).
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isSuperadmin(user))) return NextResponse.json({ error: "Superadmin only." }, { status: 403 });
  if (!AI_ENABLED) return NextResponse.json({ error: "AI is not configured." }, { status: 400 });

  let body: any = {};
  try { body = await request.json(); } catch { /* defaults */ }
  const slug = String(body.slug || "");
  const roles: string[] = Array.isArray(body.roles) ? body.roles.map((r: any) => String(r)) : [];

  const mod = agentModules().find((m) => m.slug === slug);
  if (!mod) return NextResponse.json({ error: "Unknown module." }, { status: 400 });

  const admin = createAdminClient();
  const notes = await runAgentPanel(admin, mod, roles);
  const brief = claudeCodeBrief(mod.name, slug, notes);
  return NextResponse.json({ ok: true, slug, name: mod.name, ran: notes.length, notes, brief });
}
