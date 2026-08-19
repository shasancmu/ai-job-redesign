import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Owner-only: turn a report into a shareable public link. Mints an unguessable
// public_token on the session (once) so /r/[token] can render it read-only to
// anyone with the link. Opt-in: we only mint when the owner asks to share.
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  const code = String(body.code || "").toUpperCase();
  if (!code) return Response.json({ error: "Missing report." }, { status: 400 });

  const { data: session } = await supabase
    .from("sessions")
    .select("id, host_id, public_token")
    .eq("code", code)
    .maybeSingle();
  if (!session || session.host_id !== user.id) return Response.json({ error: "Not found." }, { status: 404 });

  let token: string = session.public_token;
  if (!token) {
    token = (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, "");
    const { error } = await supabase.from("sessions").update({ public_token: token }).eq("id", session.id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ url: `/r/${token}` });
}
