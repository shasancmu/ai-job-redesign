import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roleFor } from "@/lib/orgs";
import { reportNameAI } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// One-off backfill for report titles written before the headline prompts asked
// for a name.
//
// Those prompts asked for "one honest, non-alarmist sentence" and got
// thirty-word theses, which then rendered as the report's h1 with the summary
// directly beneath saying the same thing. New runs are fixed at the prompt;
// this repairs what is already stored.
//
// Non-destructive: the original sentence moves to `headlineWas` before the short
// name is written, so a bad rename can be undone. Dry by default — it only
// writes when you pass ?commit=1.

const MAX_NAME = 60; // matches the cap the x-ray now applies at generation time
const TOO_LONG = 90; // a name nobody would write; treat as a sentence

// Where each kind of report keeps its headline.
const SLOTS: { path: string[]; }[] = [
  { path: ["xray", "headline"] },
  { path: ["plan", "headline"] },
  { path: ["report", "headline"] },
];

function get(o: any, path: string[]): any {
  return path.reduce((c, k) => (c == null ? undefined : c[k]), o);
}

async function nameFor(sentence: string): Promise<string | null> {
  try {
    const s = (await reportNameAI(sentence)).replace(/^["'\u201c\u201d]|["'\u201c\u201d]$/g, "").replace(/[.\s]+$/, "");
    return s.length >= 3 && s.length <= MAX_NAME ? s : null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  // The same gate /admin uses. isAdmin() is the older ADMIN_EMAILS allowlist and
  // is not how platform access is decided any more.
  const role = await roleFor(user);
  if (!role.superadmin) return NextResponse.json({ error: "Superadmin only" }, { status: 403 });

  const url = new URL(req.url);
  const commit = url.searchParams.get("commit") === "1";
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit") || 200)));

  const db = createAdminClient();
  const { data: rows, error } = await db
    .from("workspaces")
    .select("id, canvas, plan")
    .limit(limit)
    .order("id", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const found: { id: string; slot: string; was: string; now?: string }[] = [];

  for (const w of (rows as any[]) || []) {
    for (const { path } of SLOTS) {
      // `plan` is its own column; everything else lives inside `canvas`.
      const inPlan = path[0] === "plan";
      const root = inPlan ? { plan: w.plan } : w.canvas;
      const cur = get(root, path);
      if (typeof cur !== "string") continue;
      const s = cur.trim();
      if (s.length <= TOO_LONG) continue;              // already a name
      if (get(root, [...path.slice(0, -1), "headlineWas"])) continue; // already done

      const rec: { id: string; slot: string; was: string; now?: string } = {
        id: w.id, slot: path.join("."), was: s.slice(0, 120),
      };
      if (commit) {
        const name = await nameFor(s);
        if (name) {
          const container = get(root, path.slice(0, -1));
          container.headlineWas = s;   // reversible
          container[path[path.length - 1]] = name;
          const patch = inPlan ? { plan: root.plan } : { canvas: w.canvas };
          const { error: upErr } = await db.from("workspaces").update(patch).eq("id", w.id);
          if (!upErr) rec.now = name;
        }
      }
      found.push(rec);
    }
  }

  return NextResponse.json({
    mode: commit ? "committed" : "dry run — add &commit=1 to write",
    scanned: (rows || []).length,
    needingWork: found.length,
    rewritten: found.filter((f) => f.now).length,
    items: found.slice(0, 40),
  });
}
