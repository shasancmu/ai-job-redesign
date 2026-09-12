import { createClient } from "@/lib/supabase/server";
import { ensureHandle } from "@/lib/creator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Save a creator's public teaching identity (title, institution fallback, bio,
// avatar) and mint a stable /by/<handle> from their name. The person owns this row.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }

  const patch: Record<string, any> = {
    title: String(body.title || "").trim().slice(0, 120) || null,
    institution: String(body.institution || "").trim().slice(0, 120) || null,
    bio: String(body.bio || "").trim().slice(0, 800) || null,
    avatar_url: String(body.avatar_url || "").trim().slice(0, 500) || null,
  };

  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Ensure a URL handle exists (from their display name).
  const { data: prof } = await supabase.from("profiles").select("display_name, handle").eq("id", user.id).maybeSingle();
  let handle = (prof as any)?.handle || null;
  if (!handle && (prof as any)?.display_name) handle = await ensureHandle(user.id, (prof as any).display_name);

  return Response.json({ ok: true, handle });
}
