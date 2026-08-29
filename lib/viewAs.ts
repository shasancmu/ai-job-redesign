import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperadmin } from "@/lib/orgs";

// Superadmin "view as user" — a READ lens, not a login. When a superadmin sets
// this cookie, the consumer pages (dashboard, paywall) render as the target by
// switching their reads to the service-role client + the target's id. The
// target's session is never minted, so no action can run as them.
export const VIEW_AS_COOKIE = "view_as";

export async function viewAsTarget(
  realUser: { id: string; email?: string | null } | null
): Promise<{ id: string; email: string } | null> {
  if (!realUser || !(await isSuperadmin(realUser))) return null;
  let id = "";
  try { id = cookies().get(VIEW_AS_COOKIE)?.value || ""; } catch { return null; }
  if (!id || id === realUser.id) return null;
  try {
    const { data } = await createAdminClient().auth.admin.getUserById(id);
    if (data?.user) return { id: data.user.id, email: data.user.email || "" };
  } catch { /* target gone / no service role */ }
  return null;
}
