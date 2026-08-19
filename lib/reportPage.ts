import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Shared loader for owner-only report pages: authenticate, verify ownership,
// and read the owner's workspace canvas. Redirects (throws) if not allowed, so
// callers can destructure the result directly.
export async function loadOwnerReport(rawCode: string): Promise<{ code: string; session: any; canvas: any }> {
  const code = String(rawCode || "").toUpperCase();
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: session } = await supabase.from("sessions").select("id, host_id, exercise").eq("code", code).maybeSingle();
  if (!session || session.host_id !== user.id) redirect("/dashboard");

  const { data: ws } = await supabase
    .from("workspaces")
    .select("canvas")
    .eq("session_id", session.id)
    .eq("author_id", user.id)
    .maybeSingle();

  return { code, session, canvas: (ws?.canvas as any) || {} };
}
