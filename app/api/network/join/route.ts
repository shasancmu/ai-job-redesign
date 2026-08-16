import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { titleCaseName } from "@/lib/name";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Entry = { id: string; name: string; owner?: string };

// Set the caller's identity in the roster. Guarantees each user owns at most
// ONE self-added entry:
//   - { name }   → create OR rename the caller's own entry (never appends a dup)
//   - { pickId } → claim an existing roster name; drops any self-added orphan
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
  const name = body.name ? titleCaseName(body.name) : "";
  const pickId = body.pickId ? String(body.pickId) : "";
  if (!name && !pickId) return Response.json({ error: "name or pickId required" }, { status: 400 });

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return Response.json({ error: "service role not set" }, { status: 500 });
  }

  const { data } = await admin
    .from("network_config")
    .select("roster")
    .eq("cohort", cohort)
    .maybeSingle();
  let roster: Entry[] = data?.roster || [];

  let keptId: string;

  if (pickId) {
    // Chose an existing entry → drop any self-added entry the user owns.
    keptId = pickId;
    roster = roster.filter((r) => !(r.owner === user.id && r.id !== pickId));
  } else {
    const owned = roster.find((r) => r.owner === user.id);
    // remove any extra owned entries (defensive)
    roster = roster.filter((r) => r.owner !== user.id || r === owned);
    if (owned) {
      owned.name = name; // rename in place — no duplicate
      keptId = owned.id;
    } else {
      const sameName = roster.find((r) => r.name.trim().toLowerCase() === name.toLowerCase());
      if (sameName) {
        keptId = sameName.id; // claim an existing name, don't append
      } else {
        keptId = `u${roster.length + 1}-${Math.floor(Math.random() * 1e6)}`;
        roster.push({ id: keptId, name, owner: user.id });
      }
    }
  }

  await admin
    .from("network_config")
    .upsert({ cohort, roster, updated_at: new Date().toISOString() });

  return Response.json({ id: keptId, roster });
}
