import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/orgs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The person's own portrait — they can see exactly what's stored (transparency)
// and delete it (control). Runs under their own session so RLS enforces "own".
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const org = await getActiveOrg(user).catch(() => null);
  if (!org) return NextResponse.json({ ok: true, portrait: null, reflection: null });
  const { data } = await supabase.from("learner_portrait").select("portrait, reflection, updated_at").eq("user_id", user.id).eq("org_id", org.id).maybeSingle();
  return NextResponse.json({ ok: true, portrait: (data as any)?.portrait || null, reflection: (data as any)?.reflection || null, updatedAt: (data as any)?.updated_at || null });
}

export async function DELETE() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const org = await getActiveOrg(user).catch(() => null);
  if (org) await supabase.from("learner_portrait").delete().eq("user_id", user.id).eq("org_id", org.id);
  return NextResponse.json({ ok: true });
}
