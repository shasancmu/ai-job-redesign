import { resolveSegment, type SegmentKey } from "@/lib/pushes";

// Relationship OS automations. A rule auto-drips value to members who enter a
// state (cooling, isolated…), so the relationship maintains itself at fixed cost.
// Guardrails: only enabled rules fire; a person isn't re-hit by the same rule
// within the cool-down; each run is bounded.

const COOLDOWN_DAYS = 30;
const MAX_PER_RUN = 500;

export type Automation = {
  id: string; org_id: string; created_by: string | null; trigger: string;
  kind: string; title: string; body: string | null; href: string | null;
  cta: string | null; enabled: boolean; last_run_at: string | null; created_at: string;
};

export async function listAutomations(admin: any, orgId: string): Promise<Automation[]> {
  const { data } = await admin.from("automations").select("*").eq("org_id", orgId).order("created_at", { ascending: false });
  return ((data as any[]) || []) as Automation[];
}

export async function createAutomation(admin: any, opts: { orgId: string; createdBy: string; trigger: SegmentKey; kind: string; title: string; body?: string; href?: string; cta?: string }): Promise<{ ok: boolean; error?: string }> {
  if (!opts.title.trim()) return { ok: false, error: "A title is required." };
  const { error } = await admin.from("automations").insert({
    org_id: opts.orgId, created_by: opts.createdBy, trigger: opts.trigger, kind: opts.kind,
    title: opts.title.slice(0, 160), body: opts.body?.slice(0, 1000) || null,
    href: opts.href?.slice(0, 1000) || null, cta: opts.cta?.slice(0, 40) || null,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function updateAutomation(admin: any, id: string, orgId: string, patch: { enabled?: boolean }): Promise<void> {
  await admin.from("automations").update(patch).eq("id", id).eq("org_id", orgId);
}

export async function deleteAutomation(admin: any, id: string, orgId: string): Promise<void> {
  await admin.from("automations").delete().eq("id", id).eq("org_id", orgId);
}

// Fire one rule: drip to newly-eligible members (skip anyone this rule already
// reached inside the cool-down). Returns how many it sent.
export async function runAutomation(admin: any, org: { id: string; name: string }, a: Automation): Promise<number> {
  const stamp = async () => { await admin.from("automations").update({ last_run_at: new Date().toISOString() }).eq("id", a.id); };
  if (!a.enabled) return 0;

  const { ids } = await resolveSegment(admin, org, a.trigger as SegmentKey);
  if (!ids.length) { await stamp(); return 0; }

  // Who did this rule already reach recently?
  const since = new Date(Date.now() - COOLDOWN_DAYS * 86_400_000).toISOString();
  const { data: recent } = await admin.from("pushes").select("id").eq("automation_id", a.id).gte("created_at", since);
  const recentIds = ((recent as any[]) || []).map((p) => p.id);
  const notified = new Set<string>();
  if (recentIds.length) {
    const { data: rr } = await admin.from("push_recipients").select("user_id").in("push_id", recentIds);
    for (const r of (rr as any[]) || []) notified.add(r.user_id);
  }

  const targets = ids.filter((id) => !notified.has(id)).slice(0, MAX_PER_RUN);
  await stamp();
  if (!targets.length) return 0;

  const { data: push } = await admin.from("pushes").insert({
    org_id: org.id, created_by: a.created_by, kind: a.kind, title: a.title, body: a.body,
    href: a.href, cta: a.cta, segment_label: `Auto · ${a.trigger}`, automation_id: a.id,
  }).select("id").single();
  if (!push) return 0;
  await admin.from("push_recipients").insert(targets.map((user_id) => ({ push_id: (push as any).id, user_id })));
  return targets.length;
}

// Fire every enabled rule across all orgs. Called by the daily cron.
export async function runAllAutomations(admin: any): Promise<{ rules: number; sent: number }> {
  const { data: autos } = await admin.from("automations").select("*").eq("enabled", true);
  const list = ((autos as any[]) || []) as Automation[];
  const orgIds = [...new Set(list.map((a) => a.org_id))];
  const orgById = new Map<string, { id: string; name: string }>();
  if (orgIds.length) {
    const { data: orgs } = await admin.from("organizations").select("id, name").in("id", orgIds);
    for (const o of (orgs as any[]) || []) orgById.set(o.id, o);
  }
  let sent = 0;
  for (const a of list) {
    const org = orgById.get(a.org_id);
    if (!org) continue;
    try { sent += await runAutomation(admin, org, a); } catch { /* skip a broken rule */ }
  }
  return { rules: list.length, sent };
}
