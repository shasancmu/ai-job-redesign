import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin, UNTAGGED } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const esc = (v: any) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// One row per task across every Career/JD X-ray in the cohort — the raw
// task × exposure data, ready for structural topic modeling offline.
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

  let q = admin.from("sessions").select("id, host_id, exercise").in("exercise", ["career-xray", "jd-xray"]);
  q = untagged ? q.is("cohort", null) : q.eq("cohort", cohort);
  const { data: sessions } = await q;
  const ids = (sessions || []).map((s: any) => s.id);

  const profiles: Record<string, string> = {};
  const wsBySession: Record<string, any> = {};
  if (ids.length) {
    const [{ data: ws }, { data: profs }] = await Promise.all([
      admin.from("workspaces").select("session_id, author_id, canvas").in("session_id", ids),
      admin.from("profiles").select("id, display_name").in("id", (sessions || []).map((s: any) => s.host_id)),
    ]);
    (ws || []).forEach((w: any) => (wsBySession[w.session_id] = w));
    (profs || []).forEach((p: any) => (profiles[p.id] = p.display_name));
  }

  const header = ["participant", "exercise", "role_occupation", "soc_code", "level", "topDownExposure", "bottomUpExposure", "task", "exposure", "mode", "note"];
  const lines = [header.join(",")];
  for (const s of sessions || []) {
    const x = wsBySession[s.id]?.canvas?.xray;
    if (!x || !Array.isArray(x.tasks)) continue;
    const name = profiles[s.host_id] || "—";
    for (const t of x.tasks) {
      lines.push([
        esc(name), esc(s.exercise), esc(x.occupation), esc(x.occupationCode), esc(wsBySession[s.id]?.canvas?.level || ""),
        esc(x.topDownExposure), esc(x.bottomUpExposure), esc(t.task), esc(t.exposure), esc(t.mode), esc(t.note),
      ].join(","));
    }
  }

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="exposure-${untagged ? "untagged" : cohort}.csv"`,
    },
  });
}
