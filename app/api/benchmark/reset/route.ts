import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin, UNTAGGED } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Instructor-only: clear the benchmark results for a cohort (empties the histogram).
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!isAdmin(user.email)) return new Response("Forbidden", { status: 403 });

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    /* default */
  }
  const cohort = String(body.cohort || UNTAGGED);
  const untagged = cohort === UNTAGGED;

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return Response.json({ error: "service role not set" }, { status: 500 });
  }

  let q = admin.from("benchmark_results").delete();
  q = untagged ? q.is("cohort", null) : q.eq("cohort", cohort);
  const { error } = await q;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
