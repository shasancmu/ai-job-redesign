import { createClient } from "@/lib/supabase/server";
import { getNewsSpec } from "@/lib/mechanics/newsStore";
import { fetchNews } from "@/lib/news";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Pull current, real stories for the module's topic.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const spec = await getNewsSpec(String(body.slug || ""));
  if (!spec) return Response.json({ error: "unknown module" }, { status: 400 });
  const stories = await fetchNews(spec.topic, 6);
  if (!stories.length) return Response.json({ error: "Couldn't pull current stories right now. Try again in a moment." }, { status: 502 });
  return Response.json({ stories });
}
