import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AI_ENABLED, networkInsightAI } from "@/lib/ai";
import { personMetrics, Response as Resp } from "@/lib/network";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A personal AI read of the caller's own position in the network.
export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!AI_ENABLED) return Response.json({ text: null, reason: "ai-off" });

  const cohort = new URL(request.url).searchParams.get("cohort") || "__untagged__";

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return Response.json({ text: null, reason: "no-service-role" });
  }

  const [{ data: mine }, { data: cfg }, { data: rows }] = await Promise.all([
    admin.from("network_responses").select("self_id").eq("cohort", cohort).eq("user_id", user.id).maybeSingle(),
    admin.from("network_config").select("roster").eq("cohort", cohort).maybeSingle(),
    admin.from("network_responses").select("self_id, advice, friends").eq("cohort", cohort),
  ]);

  if (!mine?.self_id) return Response.json({ text: null, reason: "no-response" });

  const roster: { id: string }[] = cfg?.roster || [];
  const validIds = new Set(roster.map((r) => r.id));
  const responses: Resp[] = (rows || []).map((r: any) => ({
    self_id: r.self_id,
    advice: r.advice || [],
    friends: r.friends || [],
  }));

  const metrics = personMetrics(responses, mine.self_id, validIds);
  try {
    const text = await networkInsightAI(metrics);
    return Response.json({ text, metrics });
  } catch (e: any) {
    return Response.json({ text: null, reason: e?.message || "ai-error" });
  }
}
