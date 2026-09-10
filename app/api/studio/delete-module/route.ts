import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Delete one module the signed-in user authored. Works across the studio's
// storage tables — the newer engines' own *_specs tables (owner_id) and the
// shared custom_modules table (author_id) used by interviews, living cases, and
// paper explainers. Author-gated. A hard delete: the row is removed and the
// module disappears from every listing, picker, and assignment; historical
// sessions/completions referencing its slug are harmless and left intact.
const KIND_TABLE: Record<string, { table: string; owner: string }> = {
  explainer: { table: "explainer_specs", owner: "owner_id" },
  roleplay: { table: "module_specs", owner: "owner_id" },
  negotiation: { table: "negotiation_specs", owner: "owner_id" },
  benchmark: { table: "benchmark_specs", owner: "owner_id" },
  analytical: { table: "analytical_specs", owner: "owner_id" },
  redesign: { table: "redesign_specs", owner: "owner_id" },
  newsframe: { table: "newsframe_specs", owner: "owner_id" },
  liveprompt: { table: "liveprompt_specs", owner: "owner_id" },
  interview: { table: "custom_modules", owner: "author_id" },
  "paper-explainer": { table: "custom_modules", owner: "author_id" },
  "living-case": { table: "custom_modules", owner: "author_id" },
};

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const slug = String(body.slug || "").trim();
  const kind = String(body.kind || "").trim();
  const map = KIND_TABLE[kind];
  if (!slug || !map) return Response.json({ error: "Unknown module." }, { status: 400 });

  const admin = createAdminClient();
  const { data: row } = await admin.from(map.table).select(map.owner).eq("slug", slug).maybeSingle();
  if (!row) return Response.json({ error: "Not found." }, { status: 404 });
  if ((row as any)[map.owner] !== user.id) return Response.json({ error: "Not yours to delete." }, { status: 403 });

  const { error } = await admin.from(map.table).delete().eq("slug", slug).eq(map.owner, user.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
