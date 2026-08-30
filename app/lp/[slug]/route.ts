import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { facilitatorAccess } from "@/lib/orgs";
import { getLivePrompt } from "@/lib/mechanics/livePromptStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function makeCode(): string {
  const abc = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return s;
}

// Launch an authored Live Prompt: seed a word-cloud session from the template
// (question + cohort) and hand the facilitator the live projector. Reuses the
// entire word-cloud runtime — join, aggregation, AI synthesis.
export async function GET(request: Request, { params }: { params: { slug: string } }) {
  const origin = new URL(request.url).origin;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login?next=/lp/${params.slug}`);
  if (!(await facilitatorAccess(user)).ok) return NextResponse.redirect(`${origin}/dashboard`);

  const spec = await getLivePrompt(params.slug);
  if (!spec) return NextResponse.redirect(`${origin}/facilitator`);
  const cohort = new URL(request.url).searchParams.get("cohort") || null;

  const admin = createAdminClient();
  // Reuse an open run for this host + template + cohort, so re-launching returns
  // to the same live board instead of spawning duplicates.
  let code = "";
  try {
    let q = admin.from("cloud_sessions").select("code").eq("host_id", user.id).eq("spec_slug", params.slug).eq("status", "open").order("created_at", { ascending: false }).limit(1);
    if (cohort) q = q.eq("cohort", cohort); else q = q.is("cohort", null);
    const { data: existing } = await q;
    code = (existing as any[])?.[0]?.code || "";
  } catch { /* create fresh */ }

  if (!code) {
    for (let i = 0; i < 6 && !code; i++) {
      const c = makeCode();
      const { error } = await admin.from("cloud_sessions").insert({
        code: c, host_id: user.id, question: spec.prompt, status: "open", cohort, spec_slug: params.slug,
      });
      if (!error) code = c;
    }
  }
  if (!code) return NextResponse.redirect(`${origin}/facilitator`);
  return NextResponse.redirect(`${origin}/cloud/${code}/present`);
}
