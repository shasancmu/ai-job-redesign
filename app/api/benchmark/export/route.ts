import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin, UNTAGGED } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cell = (v: any) => `"${(v == null ? "" : String(v)).replace(/"/g, '""')}"`;

// CSV of each participant's benchmark score (latest attempt).
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
    return new Response("service role not set", { status: 500 });
  }

  let q = admin
    .from("benchmark_results")
    .select("user_id, score, total, created_at")
    .order("created_at", { ascending: false });
  q = untagged ? q.is("cohort", null) : q.eq("cohort", cohort);
  const { data } = await q;

  const latest = new Map<string, any>();
  for (const r of data || []) if (!latest.has(r.user_id)) latest.set(r.user_id, r);

  const ids = Array.from(latest.keys());
  let profiles: any[] = [];
  if (ids.length) {
    const { data: ps } = await admin.from("profiles").select("id, display_name").in("id", ids);
    profiles = ps || [];
  }
  const nameOf = (id: string) => profiles.find((p) => p.id === id)?.display_name || "";

  const lines = [["name", "score", "total", "submitted_at"].map(cell).join(",")];
  for (const [id, r] of latest) {
    lines.push([nameOf(id), r.score, r.total, r.created_at].map(cell).join(","));
  }

  const csv = "﻿" + lines.join("\r\n");
  const safe = (untagged ? "untagged" : cohort).replace(/[^a-zA-Z0-9._-]+/g, "_");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="benchmark_${safe}.csv"`,
    },
  });
}
