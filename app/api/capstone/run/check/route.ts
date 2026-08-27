import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A signed-in student checks whether a class run code is real before starting a
// team, so a typo is caught immediately.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Please sign in." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const code = String(body.code || "").trim().toUpperCase();
  if (!code) return Response.json({ exists: false });

  const admin = createAdminClient();
  const { data: run } = await admin.from("capstone_runs").select("label").eq("code", code).maybeSingle();
  return Response.json({ exists: !!run, label: run?.label || "" });
}
