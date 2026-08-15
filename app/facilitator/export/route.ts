import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin, UNTAGGED } from "@/lib/admin";
import { AI_CELLS, HUMAN_CELLS, FEEDBACK_FIELDS } from "@/lib/exercise";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvCell(v: any): string {
  const s = v == null ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

function gridText(grid: any, cells: typeof AI_CELLS): string {
  return cells
    .map((c) => ({ label: c.label, items: (grid?.[c.key] || []) as string[] }))
    .filter((x) => x.items.length > 0)
    .map((x) => `${x.label} (${x.items.join(", ")})`)
    .join("; ");
}

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
    return new Response("SUPABASE_SERVICE_ROLE_KEY not set", { status: 500 });
  }

  let q = admin.from("sessions").select("*").order("created_at", { ascending: false });
  q = untagged ? q.is("cohort", null) : q.eq("cohort", cohort);
  const { data: sessions } = await q;

  const sessionIds = (sessions || []).map((s: any) => s.id);
  let workspaces: any[] = [];
  let profiles: any[] = [];
  if (sessionIds.length) {
    const { data: ws } = await admin.from("workspaces").select("*").in("session_id", sessionIds);
    workspaces = ws || [];
    const ids = new Set<string>();
    (sessions || []).forEach((s: any) => {
      if (s.host_id) ids.add(s.host_id);
      if (s.guest_id) ids.add(s.guest_id);
    });
    if (ids.size) {
      const { data: ps } = await admin
        .from("profiles")
        .select("id, display_name")
        .in("id", Array.from(ids));
      profiles = ps || [];
    }
  }
  const nameOf = (id?: string | null) =>
    (id && profiles.find((p) => p.id === id)?.display_name) || "";

  const header = [
    "cohort",
    "room_code",
    "created_at",
    "status",
    "participant",
    "partner",
    "job_title_today",
    "job_description_today",
    "strategic_outcome",
    "their_real_job",
    "insight",
    "give_to_ai",
    "keep_human",
    "new_job_description",
    "final_reimagined_job",
    "feedback_plus",
    "feedback_minus",
    "feedback_question",
    "feedback_idea",
  ];

  const lines = [header.map(csvCell).join(",")];

  for (const s of sessions || []) {
    const participants = [
      { self: s.host_id, other: s.guest_id },
      { self: s.guest_id, other: s.host_id },
    ];
    for (const p of participants) {
      if (!p.self) continue;
      const w = workspaces.find((x) => x.session_id === s.id && x.author_id === p.self);
      if (!w) continue;
      const fb = w.feedback || {};
      const row = [
        s.cohort || "",
        s.code,
        s.created_at,
        s.status,
        nameOf(p.self),
        nameOf(p.other),
        w.owner_job_title || "",
        w.owner_job_description || "",
        w.strategic_outcome || "",
        w.real_job || "",
        w.insight || "",
        gridText(w.grid, AI_CELLS),
        gridText(w.grid, HUMAN_CELLS),
        w.new_job_description || "",
        w.final_description || "",
        fb.plus || "",
        fb.minus || "",
        fb.question || "",
        fb.idea || "",
      ];
      lines.push(row.map(csvCell).join(","));
    }
  }

  const csv = "﻿" + lines.join("\r\n"); // BOM so Excel reads UTF-8
  const safe = (untagged ? "untagged" : cohort).replace(/[^a-zA-Z0-9._-]+/g, "_");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reimagine_${safe}.csv"`,
    },
  });
}
