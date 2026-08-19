import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";

// Shared loader for report pages: the owner sees their own; a facilitator (admin)
// can view anyone's (for the usage dashboard drill-down), read via the service
// role. Redirects (throws) if not allowed, so callers can destructure directly.
export async function loadOwnerReport(rawCode: string): Promise<{ code: string; session: any; canvas: any }> {
  const code = String(rawCode || "").toUpperCase();
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = isAdmin(user.email);
  const db = admin ? createAdminClient() : supabase;

  const { data: session } = await db.from("sessions").select("id, host_id, exercise").eq("code", code).maybeSingle();
  if (!session) redirect("/dashboard");
  if (!admin && session.host_id !== user.id) redirect("/dashboard");

  const { data: ws } = await db
    .from("workspaces")
    .select("canvas")
    .eq("session_id", session.id)
    .eq("author_id", session.host_id)
    .maybeSingle();

  return { code, session, canvas: (ws?.canvas as any) || {} };
}
