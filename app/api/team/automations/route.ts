import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roleFor, getActiveOrg } from "@/lib/orgs";
import { createAutomation, updateAutomation, deleteAutomation } from "@/lib/automations";
import type { SegmentKey } from "@/lib/pushes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TRIGGERS = ["cooling", "at_risk", "reengage", "isolated"];

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const role = await roleFor(user);
  const active = await getActiveOrg(user).catch(() => null);
  const directorOrgs = role.memberships.filter((m) => m.role === "director").map((m) => m.org);
  let org = directorOrgs.find((o) => active && o.id === active.id) || directorOrgs[0];
  if (!org && role.superadmin && active) org = active;
  if (!org) return NextResponse.json({ error: "Not your organization." }, { status: 403 });

  let body: any = {};
  try { body = await request.json(); } catch { return NextResponse.json({ error: "bad request" }, { status: 400 }); }
  const admin = createAdminClient();
  const action = String(body.action || "create");

  if (action === "toggle") {
    if (!body.id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
    await updateAutomation(admin, String(body.id), org.id, { enabled: body.enabled !== false });
    return NextResponse.json({ ok: true });
  }
  if (action === "delete") {
    if (!body.id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
    await deleteAutomation(admin, String(body.id), org.id);
    return NextResponse.json({ ok: true });
  }

  // create
  const trigger = (TRIGGERS.includes(body.trigger) ? body.trigger : "reengage") as SegmentKey;
  const kind = ["module", "offer", "event", "update"].includes(body.kind) ? body.kind : "module";
  const res = await createAutomation(admin, {
    orgId: org.id, createdBy: user.id, trigger, kind,
    title: String(body.title || ""), body: body.body ? String(body.body) : undefined,
    href: body.href ? String(body.href) : undefined, cta: body.cta ? String(body.cta) : undefined,
  });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
