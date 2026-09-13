import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperadmin } from "@/lib/orgs";
import { translateStringsAI } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// TEMP diagnostic: does translateStringsAI translate in production, and does the
// translations cache table read/write? Superadmin only. Remove after debugging.
export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isSuperadmin(user))) return Response.json({ error: "no" }, { status: 403 });

  const lang = new URL(request.url).searchParams.get("lang") || "Chinese (Simplified)";
  const samples = ["Prompting Lab", "Turn a vague ask into a prompt that gets the output you meant.", "Name the workflow"];
  const out: any = { lang };
  try { out.translated = await translateStringsAI(samples, lang); }
  catch (e: any) { out.translateError = String(e?.message || e); }
  // Table probe
  try {
    const admin = createAdminClient();
    const { error, count } = await admin.from("translations").select("*", { count: "exact", head: true });
    out.tableOk = !error; out.tableError = error?.message || null; out.rowCount = count ?? null;
  } catch (e: any) { out.tableProbeError = String(e?.message || e); }
  return Response.json(out);
}
