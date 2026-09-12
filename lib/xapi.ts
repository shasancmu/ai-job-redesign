// xAPI (Experience API / Tin Can) emission. Enterprise L&D buyers run a Learning
// Record Store (LRS) and expect learning events to land in it. When an org has
// configured an LRS (organizations.lrs_endpoint + lrs_key), we forward the
// learner's completions, scores, and reactions there as xAPI statements.
//
// Best-effort and fire-and-forget: an LRS being slow, down, or unconfigured must
// never affect the learner's run. Nothing here is awaited on a critical path.
import { createAdminClient } from "@/lib/supabase/admin";

const APP = "https://superadditive.app";
const VERBS: Record<string, { id: string; label: string }> = {
  completed: { id: "http://adlnet.gov/expapi/verbs/completed", label: "completed" },
  scored:    { id: "http://adlnet.gov/expapi/verbs/scored", label: "scored" },
  attempted: { id: "http://adlnet.gov/expapi/verbs/attempted", label: "attempted" },
  reacted:   { id: "http://id.tincanapi.com/verb/rated", label: "rated" },
};

export type XapiEvent = {
  personId: string;
  personEmail?: string | null;
  personName?: string | null;
  module: string;          // exercise slug / activity id
  moduleName?: string | null;
  verb: keyof typeof VERBS;
  score?: number | null;   // 0-100 competence (L2), mapped to result.score.scaled
  raw?: number | null;     // e.g. an L1 rating 1-5, sent as result.score.raw with min/max
  min?: number | null;
  max?: number | null;
  cohort?: string | null;
};

type LrsOrg = { id: string; endpoint: string; auth: string; name?: string | null };

// Orgs the person belongs to that have an LRS configured. (Usually one.)
async function lrsOrgsFor(admin: any, personId: string): Promise<LrsOrg[]> {
  const { data } = await admin
    .from("org_members")
    .select("organizations(id, name, lrs_endpoint, lrs_key)")
    .eq("user_id", personId);
  const out: LrsOrg[] = [];
  for (const r of (data || []) as any[]) {
    const o = r.organizations;
    if (o?.lrs_endpoint && o?.lrs_key) out.push({ id: o.id, endpoint: String(o.lrs_endpoint), auth: String(o.lrs_key), name: o.name });
  }
  return out;
}

function statement(e: XapiEvent, actorEmail: string | null) {
  const verb = VERBS[e.verb] || VERBS.completed;
  const actor: any = { objectType: "Agent", name: e.personName || undefined };
  if (actorEmail) actor.mbox = `mailto:${actorEmail}`;
  else actor.account = { homePage: APP, name: e.personId };

  const result: any = {};
  if (typeof e.score === "number" && Number.isFinite(e.score)) {
    result.score = { scaled: Math.max(0, Math.min(1, e.score / 100)), raw: e.score, min: 0, max: 100 };
    result.success = e.score >= 50;
  } else if (typeof e.raw === "number" && Number.isFinite(e.raw)) {
    result.score = { raw: e.raw, min: e.min ?? 1, max: e.max ?? 5 };
  }
  if (e.verb === "completed") result.completion = true;

  const stmt: any = {
    actor,
    verb: { id: verb.id, display: { "en-US": verb.label } },
    object: {
      objectType: "Activity",
      id: `${APP}/x/${encodeURIComponent(e.module)}`,
      definition: {
        type: "http://adlnet.gov/expapi/activities/course",
        name: { "en-US": e.moduleName || e.module },
      },
    },
    timestamp: new Date().toISOString(),
  };
  if (Object.keys(result).length) stmt.result = result;
  if (e.cohort) stmt.context = { registration: undefined, extensions: { [`${APP}/x/cohort`]: e.cohort } };
  return stmt;
}

// POST an xAPI statement to every LRS-configured org the person belongs to.
// Swallows all errors. Call without awaiting on hot paths (or await inside an
// already-detached best-effort block).
export async function emitXapi(e: XapiEvent): Promise<void> {
  if (!e?.personId || !e?.module || !VERBS[e.verb]) return;
  try {
    const admin = createAdminClient();
    const orgs = await lrsOrgsFor(admin, e.personId);
    if (!orgs.length) return; // nobody's listening — skip the email lookup entirely

    // Prefer a real mbox when the org's LRS gets one anyway; fall back to an
    // account id so no email is invented.
    let email = e.personEmail || null;
    if (!email) { try { const { data } = await admin.auth.admin.getUserById(e.personId); email = data?.user?.email || null; } catch {} }

    const stmt = statement(e, email);
    await Promise.all(orgs.map(async (o) => {
      try {
        await fetch(o.endpoint.replace(/\/$/, "") + "/statements", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Experience-API-Version": "1.0.3",
            Authorization: "Basic " + Buffer.from(o.auth).toString("base64"),
          },
          body: JSON.stringify(stmt),
          signal: AbortSignal.timeout(5000),
        });
      } catch { /* LRS down/slow — never our problem */ }
    }));
  } catch { /* never block the learner */ }
}
