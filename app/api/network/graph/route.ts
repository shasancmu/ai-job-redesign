import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildEdges, inDegree, betweenness, topN, Response as Resp } from "@/lib/network";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Aggregated, anonymized graph for a cohort. Node payload carries NO names —
// only indices. Names appear only in the top-5 leaderboards (the reveal).
export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const cohort = new URL(request.url).searchParams.get("cohort") || "__untagged__";

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return Response.json({ error: "service role not set" }, { status: 500 });
  }

  const [{ data: cfg }, { data: rows }] = await Promise.all([
    admin.from("network_config").select("roster").eq("cohort", cohort).maybeSingle(),
    admin.from("network_responses").select("self_id, advice, friends").eq("cohort", cohort),
  ]);

  const roster: { id: string; name: string }[] = cfg?.roster || [];
  const nameOf = (id: string) => roster.find((r) => r.id === id)?.name || "—";
  const validIds = new Set(roster.map((r) => r.id));
  const responses: Resp[] = (rows || []).map((r: any) => ({
    self_id: r.self_id,
    advice: r.advice || [],
    friends: r.friends || [],
  }));

  const adviceEdges = buildEdges(responses, "advice", validIds);
  const friendEdges = buildEdges(responses, "friends", validIds);

  // Node set = everyone who appears in either network.
  const nodeIds = Array.from(
    new Set([
      ...adviceEdges.flatMap((e) => [e.s, e.t]),
      ...friendEdges.flatMap((e) => [e.s, e.t]),
    ])
  );
  const idx = new Map(nodeIds.map((id, i) => [id, i]));

  const net = (edges: typeof adviceEdges) => {
    const indeg = inDegree(edges, nodeIds);
    const betw = betweenness(edges, nodeIds);
    return {
      edges: edges.map((e) => ({ s: idx.get(e.s), t: idx.get(e.t), strong: e.strong })),
      degree: nodeIds.map((id) => indeg.get(id) || 0),
      indegTop: topN(indeg, nameOf, 5),
      betwTop: topN(betw, nameOf, 5),
    };
  };

  return Response.json({
    n: nodeIds.length,
    respondents: responses.length,
    advice: net(adviceEdges),
    friends: net(friendEdges),
  });
}
