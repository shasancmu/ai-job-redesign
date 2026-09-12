import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Data portability: a signed-in user downloads everything the platform holds about
// them, as JSON. Standard governance / security-questionnaire requirement (GDPR
// access + portability). Only ever the caller's own data.
export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let admin;
  try { admin = createAdminClient(); } catch { return Response.json({ error: "Export is not available." }, { status: 503 }); }

  const [profile, sessions, workspaces, measures, conversations] = await Promise.all([
    admin.from("profiles").select("*").eq("id", user.id).maybeSingle().then((r) => r.data),
    admin.from("sessions").select("*").or(`host_id.eq.${user.id},guest_id.eq.${user.id}`).then((r) => r.data || []),
    admin.from("workspaces").select("*").eq("author_id", user.id).then((r) => r.data || []),
    admin.from("learning_measures").select("*").eq("person_id", user.id).then((r) => r.data || []).catch(() => []),
    admin.from("conversations").select("*").eq("person_id", user.id).then((r) => r.data || []).catch(() => []),
  ]);

  await logAudit({ actorId: user.id, actorEmail: user.email, action: "data.export", target: user.id, ip: clientIp(request) });

  const payload = {
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email },
    profile, sessions, workspaces, learning_measures: measures, conversations,
  };
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="superadditive-export-${user.id.slice(0, 8)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
