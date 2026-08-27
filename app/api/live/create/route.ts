import { createClient } from "@/lib/supabase/server";
import { getLiveSpec } from "@/lib/mechanics/liveStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function makeCode() { const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let o = ""; for (let i = 0; i < 5; i++) o += c[Math.floor(Math.random() * c.length)]; return o; }

// A facilitator opens a run of an authored live activity → a join code.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const slug = String(body.slug || "").toLowerCase();
  const spec = await getLiveSpec(slug);
  if (!spec) return Response.json({ error: "unknown activity" }, { status: 400 });
  for (let i = 0; i < 5; i++) {
    const code = makeCode();
    const { error } = await supabase.from("live_sessions").insert({ code, host_id: user.id, slug, status: "open" });
    if (!error) return Response.json({ code });
    if (!`${error.message}`.toLowerCase().includes("duplicate")) return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ error: "Couldn't open a room. Try again." }, { status: 500 });
}
