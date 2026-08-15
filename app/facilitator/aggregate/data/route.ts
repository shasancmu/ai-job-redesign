import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin, UNTAGGED } from "@/lib/admin";
import { CELLS } from "@/lib/exercise";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!isAdmin(user.email)) return new Response("Forbidden", { status: 403 });

  const cohort = new URL(request.url).searchParams.get("cohort") || UNTAGGED;
  const untagged = cohort === UNTAGGED;

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return Response.json({ error: "service role not set" }, { status: 500 });
  }

  let sq = admin.from("sessions").select("id");
  sq = untagged ? sq.is("cohort", null) : sq.eq("cohort", cohort);
  const { data: sessions } = await sq;
  const ids = (sessions || []).map((s: any) => s.id);

  if (ids.length === 0) {
    return Response.json({
      responses: 0,
      roleTotals: { ai: 0, human: 0 },
      aiVerbs: [],
      humanVerbs: [],
      cellTotals: [],
    });
  }

  const { data: workspaces } = await admin
    .from("workspaces")
    .select("grid, new_job_description, final_description")
    .in("session_id", ids);

  const roleOf: Record<string, "ai" | "human"> = {};
  const labelOf: Record<string, string> = {};
  for (const c of CELLS) {
    roleOf[c.key] = c.role;
    labelOf[c.key] = c.label;
  }

  const aiCount = new Map<string, number>();
  const humanCount = new Map<string, number>();
  const cellCount = new Map<string, number>();
  let responses = 0;

  for (const w of workspaces || []) {
    const grid = (w.grid || {}) as Record<string, string[]>;
    let touched = false;
    for (const key of Object.keys(grid)) {
      const role = roleOf[key];
      if (!role) continue;
      const items = grid[key] || [];
      if (items.length) {
        touched = true;
        cellCount.set(key, (cellCount.get(key) || 0) + items.length);
      }
      for (const v of items) {
        const norm = String(v).trim();
        if (!norm) continue;
        const m = role === "ai" ? aiCount : humanCount;
        m.set(norm, (m.get(norm) || 0) + 1);
      }
    }
    if (touched) responses++;
  }

  const sortMap = (m: Map<string, number>) =>
    Array.from(m.entries())
      .map(([verb, count]) => ({ verb, count }))
      .sort((a, b) => b.count - a.count);

  const aiVerbs = sortMap(aiCount);
  const humanVerbs = sortMap(humanCount);
  const roleTotals = {
    ai: aiVerbs.reduce((s, x) => s + x.count, 0),
    human: humanVerbs.reduce((s, x) => s + x.count, 0),
  };
  const cellTotals = CELLS.map((c) => ({
    key: c.key,
    label: c.label,
    role: c.role,
    count: cellCount.get(c.key) || 0,
  }));

  return Response.json({ responses, roleTotals, aiVerbs, humanVerbs, cellTotals });
}
