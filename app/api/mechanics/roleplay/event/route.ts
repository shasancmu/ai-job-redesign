import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Records that a run reached a phase, for the drop-off funnel. Best effort:
// a missing table or any error must never disrupt the learner.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ ok: false }, { status: 200 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ ok: false }, { status: 200 }); }
  const slug = String(body.slug || "").slice(0, 200);
  const phase = String(body.phase || "").slice(0, 60);
  if (!slug || !phase) return Response.json({ ok: false }, { status: 200 });

  try {
    await createAdminClient().from("roleplay_events").insert({
      slug,
      phase,
      code: body.code ? String(body.code).slice(0, 40) : null,
      cohort: body.cohort ? String(body.cohort).slice(0, 64) : null,
      user_id: user.id,
    });
  } catch { /* table not migrated yet, or transient */ }
  return Response.json({ ok: true });
}
