import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roleFor, getActiveOrg } from "@/lib/orgs";
import { createPush, type SegmentKey } from "@/lib/pushes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A director sends a push (module drop / offer / event / update) to a segment.
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

  const title = String(body.title || "").trim();
  if (!title) return NextResponse.json({ error: "A title is required." }, { status: 400 });
  const kind = ["module", "offer", "event", "update"].includes(body.kind) ? body.kind : "update";
  const segment = (["everyone", "active", "cooling", "at_risk", "reengage", "isolated", "connectors"].includes(body.segment) ? body.segment : "everyone") as SegmentKey;

  const admin = createAdminClient();
  const res = await createPush(admin, {
    org,
    createdBy: user.id,
    kind,
    title,
    body: body.body ? String(body.body) : undefined,
    href: body.href ? String(body.href) : undefined,
    cta: body.cta ? String(body.cta) : undefined,
    segment,
  });
  if (!res.ok) return NextResponse.json({ error: res.error || "Could not send." }, { status: 400 });
  return NextResponse.json({ ok: true, count: res.count });
}
