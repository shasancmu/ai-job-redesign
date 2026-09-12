// Append-only audit trail for security-relevant actions — the backbone of the
// security questionnaire and SOC 2 evidence. Server-only, best-effort: a logging
// failure (or an unmigrated DB) must never break the action it's recording.
import { createAdminClient } from "@/lib/supabase/admin";

export type AuditEntry = {
  actorId?: string | null;
  actorEmail?: string | null;
  orgId?: string | null;
  action: string;        // dotted verb, e.g. "module.publish"
  target?: string | null;
  meta?: Record<string, any> | null;
  ip?: string | null;
};

export async function logAudit(e: AuditEntry): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("audit_log").insert({
      actor_id: e.actorId || null,
      actor_email: e.actorEmail || null,
      org_id: e.orgId || null,
      action: e.action,
      target: e.target || null,
      meta: e.meta || null,
      ip: e.ip || null,
    });
  } catch { /* never block the audited action */ }
}

// Pull the client IP from a request's forwarding headers (best-effort).
export function clientIp(request: Request): string | null {
  const h = request.headers;
  return (h.get("x-forwarded-for") || "").split(",")[0].trim() || h.get("x-real-ip") || null;
}

export type AuditRow = { id: number; at: string; actor_email: string | null; action: string; target: string | null; meta: any };

// Recent audit entries for an org (for the admin/director audit view).
export async function recentAuditForOrg(orgId: string, limit = 200): Promise<AuditRow[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("audit_log").select("id, at, actor_email, action, target, meta").eq("org_id", orgId).order("at", { ascending: false }).limit(limit);
    return (data as AuditRow[]) || [];
  } catch { return []; }
}
