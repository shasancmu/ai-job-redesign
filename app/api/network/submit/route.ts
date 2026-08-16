import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Save (or update) this person's nominations.
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  const cohort = String(body.cohort || "__untagged__");
  const selfId = body.selfId ? String(body.selfId) : null;
  const advice = Array.isArray(body.advice) ? body.advice.map(String) : [];
  const friends = Array.isArray(body.friends) ? body.friends.map(String) : [];

  const { error } = await supabase.from("network_responses").upsert(
    {
      cohort,
      user_id: user.id,
      self_id: selfId,
      advice,
      friends,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "cohort,user_id" }
  );
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
