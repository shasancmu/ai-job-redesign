import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { caseAuthorId, LIVING_CASE_TYPE } from "@/lib/cases/store";
import { normalizeCode } from "@/lib/classes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const csvCell = (v: unknown) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

// Instructor gradebook export: the roster of the case's assigned class(es) x each
// student's engagement (opened / made a call / questions / last activity), as CSV
// to drop into any LMS gradebook. Author-gated. The bridge to full LTI passback.
// Query: ?slug=<case>&c=<optional class code>.
export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Sign in required.", { status: 401 });

  const url = new URL(request.url);
  const slug = String(url.searchParams.get("slug") || "").trim();
  if (!slug) return new Response("Missing case.", { status: 400 });
  if ((await caseAuthorId(slug)) !== user.id) return new Response("Not yours.", { status: 403 });

  const admin = createAdminClient();
  const { data: mod } = await admin.from("custom_modules").select("spec").eq("slug", slug).eq("super_type", LIVING_CASE_TYPE).maybeSingle();
  const spec: any = (mod as any)?.spec || {};

  const only = url.searchParams.get("c");
  let codes: string[] = only ? [normalizeCode(only)] : (Array.isArray(spec.cohorts) ? spec.cohorts.map((c: string) => normalizeCode(c)) : []);
  codes = [...new Set(codes.filter(Boolean))];

  const { data: classes } = codes.length
    ? await admin.from("classes").select("id, code, name").eq("owner_id", user.id).in("code", codes)
    : { data: [] as any[] };
  const classList = (classes || []) as { id: string; code: string; name: string }[];
  if (!classList.length) return new Response("Assign this case to a class you own first (Insights > Who can open this case), then export.", { status: 400 });

  const classIds = classList.map((c) => c.id);
  const nameByClassId = new Map(classList.map((c) => [c.id, c.name]));
  const [{ data: members }, { data: profs }, { data: events }] = await Promise.all([
    admin.from("class_members").select("class_id, user_id").in("class_id", classIds).limit(20000),
    admin.from("profiles").select("id, display_name").limit(20000),
    admin.from("case_events").select("user_id, kind, created_at").eq("case_slug", slug).not("user_id", "is", null).limit(20000),
  ]);
  const nameById = new Map(((profs || []) as any[]).map((p) => [p.id, p.display_name]));

  const eng = new Map<string, { opened: boolean; decided: boolean; asks: number; last: string }>();
  for (const e of ((events || []) as any[])) {
    const g = eng.get(e.user_id) || { opened: false, decided: false, asks: 0, last: "" };
    if (e.kind === "open") g.opened = true;
    if (e.kind === "commit" || e.kind === "complete") g.decided = true;
    if (e.kind === "ask") g.asks++;
    if (!g.last || e.created_at > g.last) g.last = e.created_at;
    eng.set(e.user_id, g);
  }

  const header = ["Student", "Class", "Opened", "Made a call", "Questions", "Last activity"];
  const lines = [header.map(csvCell).join(",")];
  for (const m of ((members || []) as any[])) {
    const g = eng.get(m.user_id);
    lines.push([
      nameById.get(m.user_id) || "Student",
      nameByClassId.get(m.class_id) || "",
      g?.opened ? "yes" : "no",
      g?.decided ? "yes" : "no",
      g?.asks || 0,
      g?.last ? new Date(g.last).toISOString().slice(0, 10) : "",
    ].map(csvCell).join(","));
  }

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug.slice(0, 40)}-gradebook.csv"`,
    },
  });
}
