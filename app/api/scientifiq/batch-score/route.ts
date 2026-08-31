import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { SCIENTIFIQ_ENABLED, ScientifiqError } from "@/lib/scientifiq";
import { SCISCORE_ENABLED } from "@/lib/sciscore";
import { isSuperadmin } from "@/lib/orgs";
import { batchScore } from "@/lib/batchScore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX = 50;

// Batch-score up to 50 abstracts across every potential (commercial, scientific,
// social, interdisciplinary, complex, defense). Superadmin only — it's a bulk
// tool and includes the gated Defense model.
export async function POST(request: Request) {
  setFlow("batch-score");
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isSuperadmin(user))) return Response.json({ error: "Superadmin only." }, { status: 403 });
  if (!SCISCORE_ENABLED) return Response.json({ error: "The scoring service (SCISCORE_URL) is not configured." }, { status: 503 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const raw: any[] = Array.isArray(body.items) ? body.items : [];
  const items = raw
    .map((r, i) => ({ id: String(r?.id ?? i + 1).slice(0, 120), text: String(r?.text || "").trim().slice(0, 6000) }))
    .filter((r) => r.text.length >= 80)
    .slice(0, MAX);
  if (items.length === 0) return Response.json({ error: "Provide up to 50 abstracts (each a few sentences)." }, { status: 400 });

  try {
    const rows = await batchScore(items, { includeDefense: true });
    return Response.json({ rows, scored: rows.length, dropped: raw.length - items.length });
  } catch (e: any) {
    if (e instanceof ScientifiqError) return Response.json({ error: e.message }, { status: e.status < 600 ? e.status : 502 });
    return Response.json({ error: e?.message || "Batch scoring failed." }, { status: 500 });
  }
}
