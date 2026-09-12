import { createClient } from "@/lib/supabase/server";
import { setAttributionStatus } from "@/lib/creator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The credited person accepts or disavows a module someone attributed to them.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const slug = String(body.slug || "");
  const status = body.action === "accept" ? "active" : "removed";
  if (!slug) return Response.json({ error: "bad request" }, { status: 400 });

  const ok = await setAttributionStatus(user.id, slug, status);
  if (!ok) return Response.json({ error: "Not yours to change." }, { status: 403 });
  return Response.json({ ok: true, status });
}
