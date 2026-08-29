import { gatherRelationshipOS } from "@/lib/relationships";

// The Relationship OS "push" — the director's action side. Resolve a segment to
// recipients, store the dispatch + per-recipient rows (so engagement is
// trackable), and read a learner's inbox of recent pushes.

export type SegmentKey = "everyone" | "active" | "cooling" | "at_risk" | "reengage" | "isolated" | "connectors";

export const SEGMENTS: { key: SegmentKey; label: string; hint: string }[] = [
  { key: "everyone", label: "Everyone", hint: "all members of your cohorts" },
  { key: "active", label: "Active", hint: "anyone who's run something" },
  { key: "reengage", label: "Cooling & at-risk", hint: "slipping — a value deposit now" },
  { key: "cooling", label: "Cooling", hint: "recently going quiet" },
  { key: "at_risk", label: "At risk", hint: "quiet 3–6 months" },
  { key: "isolated", label: "Isolated", hint: "no peer ties yet" },
  { key: "connectors", label: "Connectors", hint: "brokers who spread value" },
];

// Resolve a segment to the set of member user-ids, using the live network read.
export async function resolveSegment(admin: any, org: { id: string; name: string }, segment: SegmentKey): Promise<{ ids: string[]; label: string }> {
  const os = await gatherRelationshipOS(admin, org);
  const label = SEGMENTS.find((s) => s.key === segment)?.label || "Everyone";
  let ids: string[] = [];
  switch (segment) {
    case "active": ids = os.states.filter((m) => m.lastActiveDays != null).map((m) => m.userId); break;
    case "cooling": ids = os.states.filter((m) => m.bucket === "cooling").map((m) => m.userId); break;
    case "at_risk": ids = os.states.filter((m) => m.bucket === "at_risk").map((m) => m.userId); break;
    case "reengage": ids = os.reengage.map((m) => m.userId); break;
    case "isolated": ids = os.isolates.map((m) => m.userId); break;
    case "connectors": ids = os.connectors.map((m) => m.userId); break;
    default: ids = os.states.map((m) => m.userId);
  }
  return { ids, label };
}

export async function createPush(
  admin: any,
  opts: { org: { id: string; name: string }; createdBy: string; kind: string; title: string; body?: string; href?: string; cta?: string; segment: SegmentKey }
): Promise<{ ok: boolean; count: number; error?: string }> {
  const { ids, label } = await resolveSegment(admin, opts.org, opts.segment);
  if (!ids.length) return { ok: false, count: 0, error: "No one is in that segment yet." };

  const { data: push, error } = await admin
    .from("pushes")
    .insert({
      org_id: opts.org.id,
      created_by: opts.createdBy,
      kind: opts.kind,
      title: opts.title.slice(0, 160),
      body: opts.body ? opts.body.slice(0, 1000) : null,
      href: opts.href ? opts.href.slice(0, 1000) : null,
      cta: opts.cta ? opts.cta.slice(0, 40) : null,
      segment_label: label,
    })
    .select("id")
    .single();
  if (error || !push) return { ok: false, count: 0, error: error?.message || "Could not send." };

  // Fan out recipients (bounded).
  const rows = ids.slice(0, 5000).map((user_id) => ({ push_id: push.id, user_id }));
  await admin.from("push_recipients").insert(rows);
  return { ok: true, count: rows.length };
}

export type InboxItem = { id: string; kind: string; title: string; body: string | null; href: string | null; cta: string | null; from: string; seen: boolean };

// A learner's recent pushes (newest first). Marks them seen as a side effect so
// the "new" state clears after one view.
export async function inboxFor(admin: any, userId: string, orgName: string): Promise<InboxItem[]> {
  const { data } = await admin
    .from("push_recipients")
    .select("push_id, seen_at, pushes(id, kind, title, body, href, cta, created_at)")
    .eq("user_id", userId)
    .order("created_at", { foreignTable: "pushes", ascending: false })
    .limit(6);
  const rows = ((data as any[]) || []).filter((r) => r.pushes);
  const items: InboxItem[] = rows.map((r) => ({
    id: r.pushes.id,
    kind: r.pushes.kind,
    title: r.pushes.title,
    body: r.pushes.body,
    href: r.pushes.href,
    cta: r.pushes.cta,
    from: orgName,
    seen: !!r.seen_at,
  }));
  // Mark unseen as seen (best-effort).
  const unseen = rows.filter((r) => !r.seen_at).map((r) => r.push_id);
  if (unseen.length) {
    try { await admin.from("push_recipients").update({ seen_at: new Date().toISOString() }).eq("user_id", userId).in("push_id", unseen); } catch { /* ignore */ }
  }
  return items;
}
