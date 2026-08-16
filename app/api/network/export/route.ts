import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cell = (v: any) => `"${(v == null ? "" : String(v)).replace(/"/g, '""')}"`;

// Edge list of the network: one row per nomination. Handy for Gephi / R.
export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!isAdmin(user.email)) return new Response("Forbidden", { status: 403 });

  const cohort = new URL(request.url).searchParams.get("cohort") || "__untagged__";

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return new Response("service role not set", { status: 500 });
  }

  const [{ data: cfg }, { data: rows }] = await Promise.all([
    admin.from("network_config").select("roster").eq("cohort", cohort).maybeSingle(),
    admin.from("network_responses").select("self_id, advice, friends").eq("cohort", cohort),
  ]);

  const roster: { id: string; name: string }[] = cfg?.roster || [];
  const nameOf = (id: string) => roster.find((r) => r.id === id)?.name || id;
  const valid = new Set(roster.map((r) => r.id));

  const lines = [["source", "type", "target"].map(cell).join(",")];
  for (const r of rows || []) {
    if (!r.self_id || !valid.has(r.self_id)) continue;
    const src = nameOf(r.self_id);
    for (const t of r.advice || [])
      if (valid.has(t)) lines.push([src, "advice", nameOf(t)].map(cell).join(","));
    for (const t of r.friends || [])
      if (valid.has(t)) lines.push([src, "friend", nameOf(t)].map(cell).join(","));
  }

  const csv = "﻿" + lines.join("\r\n");
  const safe = cohort.replace(/[^a-zA-Z0-9._-]+/g, "_");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="network_${safe}.csv"`,
    },
  });
}
