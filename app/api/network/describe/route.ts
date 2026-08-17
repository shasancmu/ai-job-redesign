import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";
import { AI_ENABLED, networkDescribeAI } from "@/lib/ai";
import { getUserLanguage, withLanguage } from "@/lib/lang";
import { overallMetrics, Response as Resp } from "@/lib/network";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Instructor-only: an AI narrative of the whole network.
export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!isAdmin(user.email)) return new Response("Forbidden", { status: 403 });
  if (!AI_ENABLED) return Response.json({ text: null, reason: "ai-off" });

  const cohort = new URL(request.url).searchParams.get("cohort") || "__untagged__";

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return Response.json({ text: null, reason: "no-service-role" });
  }

  const [{ data: cfg }, { data: rows }] = await Promise.all([
    admin.from("network_config").select("roster").eq("cohort", cohort).maybeSingle(),
    admin.from("network_responses").select("self_id, advice, friends").eq("cohort", cohort),
  ]);

  const roster = cfg?.roster || [];
  const responses: Resp[] = (rows || []).map((r: any) => ({
    self_id: r.self_id,
    advice: r.advice || [],
    friends: r.friends || [],
  }));

  const metrics = overallMetrics(responses, roster);
  try {
    const text = await withLanguage(await getUserLanguage(supabase, user.id), () => networkDescribeAI(metrics));
    return Response.json({ text, metrics });
  } catch (e: any) {
    return Response.json({ text: null, reason: e?.message || "ai-error" });
  }
}
