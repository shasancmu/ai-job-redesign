import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";
import { normalizeCode } from "@/lib/classes";
import {
  DEMO_NAMES,
  jobGrid,
  jobText,
  jobPlan,
  jobFeedback,
  workflowDoc,
  soloChat,
  canvasSeed,
  fourASeed,
  negSeed,
  haggleSeed,
  randomOfferOutcome,
  randomHaggleOutcome,
  careerSeed,
} from "@/lib/seedData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEMO_DOMAIN = "seed.superadditive.co";
const MODULES = [
  "reimagine-job",
  "reimagine-workflow",
  "solo-ai",
  "career-x-ray",
  "workflow-solo",
  "execution-4a",
  "balanced-scorecard",
  "good-business",
  "close-the-offer",
  "name-your-price",
  "ai-canvas",
  "opportunity-capability",
  "test-the-bet",
  "benchmark",
  "network",
];

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

// Every synthetic auth user for a cohort shares this email prefix, so cleanup
// can find them even if the class row is gone.
const emailFor = (code: string, i: number) => `demo.${code.toLowerCase()}.${i}@${DEMO_DOMAIN}`;

async function findDemoUserIds(admin: any, code: string): Promise<string[]> {
  const ids: string[] = [];
  const prefix = `demo.${code.toLowerCase()}.`;
  // listUsers is paginated; a demo cohort is small so a couple of pages cover it.
  for (let page = 1; page <= 5; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    const users = data?.users || [];
    for (const u of users) {
      if (u.email && u.email.startsWith(prefix) && u.email.endsWith(`@${DEMO_DOMAIN}`)) ids.push(u.id);
    }
    if (users.length < 200) break;
  }
  return ids;
}

async function clearCohort(admin: any, code: string) {
  const ids = await findDemoUserIds(admin, code);
  // Deleting the auth user cascades to profiles, sessions (as host), workspaces,
  // workflow_docs, benchmark_results, network_responses, class_members.
  for (const id of ids) {
    await admin.auth.admin.deleteUser(id).catch(() => {});
  }
  // Clean up rows not tied to a user FK.
  await admin.from("sessions").delete().eq("cohort", code);
  await admin.from("benchmark_results").delete().eq("cohort", code);
  await admin.from("network_responses").delete().eq("cohort", code);
  await admin.from("network_config").delete().eq("cohort", code);
  await admin.from("classes").delete().eq("code", code);
  return ids.length;
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!isAdmin(user.email)) return new Response("Forbidden", { status: 403 });

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return Response.json({ error: "SUPABASE_SERVICE_ROLE_KEY not set." }, { status: 500 });
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {}
  const code = normalizeCode(body.code || "DEMOCOHORT") || "DEMOCOHORT";

  // Idempotent: wipe any previous demo for this code first.
  await clearCohort(admin, code);

  // 1) Create synthetic auth users + profiles.
  const users: { id: string; name: string }[] = [];
  for (let i = 0; i < DEMO_NAMES.length; i++) {
    const name = DEMO_NAMES[i];
    const { data: created, error } = await admin.auth.admin.createUser({
      email: emailFor(code, i),
      password: `Demo!${Math.random().toString(36).slice(2)}${i}`,
      email_confirm: true,
      user_metadata: { display_name: name },
    });
    if (error || !created?.user) {
      return Response.json({ error: `Couldn't create demo user: ${error?.message || "unknown"}` }, { status: 500 });
    }
    users.push({ id: created.user.id, name });
  }
  await admin.from("profiles").upsert(
    users.map((u) => ({ id: u.id, display_name: u.name })),
    { onConflict: "id" }
  );

  // 2) The class (its code IS the cohort).
  const { data: klass } = await admin
    .from("classes")
    .insert({ code, name: "Demo Cohort — sample data", owner_id: user.id, modules: MODULES })
    .select("id")
    .single();
  if (klass) {
    await admin
      .from("class_members")
      .upsert(users.map((u) => ({ class_id: klass.id, user_id: u.id })), { onConflict: "class_id,user_id" });
  }

  // 3) Network: roster of everyone + a response each (self + advice + friends).
  const n = users.length;
  const roster = users.map((u) => ({ id: u.id, name: u.name }));
  await admin.from("network_config").upsert({ cohort: code, roster }, { onConflict: "cohort" });
  const hubs = [0, 3, 7]; // a few people everyone seeks → high in-degree / brokers
  const netRows = users.map((u, i) => {
    const advice = Array.from(new Set([users[(i + 1) % n].id, users[(i + 2) % n].id, users[hubs[i % hubs.length]].id])).filter(
      (id) => id !== u.id
    );
    const friends = Array.from(new Set([users[(i + 1) % n].id, users[(i - 1 + n) % n].id])).filter((id) => id !== u.id);
    return { cohort: code, user_id: u.id, self_id: u.id, advice, friends };
  });
  await admin.from("network_responses").upsert(netRows, { onConflict: "cohort,user_id" });

  // 4) Benchmark: a spread of scores out of 7.
  const scores = [2, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 7];
  await admin.from("benchmark_results").insert(
    users.map((u, i) => ({ user_id: u.id, cohort: code, score: scores[i % scores.length], total: 7, answers: {} }))
  );

  // 5) Paired job (3 pairs), workflow (2 pairs), solo, solo-workflow.
  const sessionRows: any[] = [];
  const workspaceRows: any[] = [];
  const docRows: any[] = [];

  const addPairJob = (a: any, b: any, seed: number) => {
    const id = crypto.randomUUID();
    sessionRows.push({ id, code: makeCode(), cohort: code, exercise: "job", host_id: a.id, guest_id: b.id, status: "done", phase: 8, phase_started_at: new Date().toISOString() });
    for (const [author, subject, s] of [[a, b, seed], [b, a, seed + 1]] as const) {
      workspaceRows.push({
        session_id: id,
        author_id: author.id,
        subject_id: subject.id,
        ...jobText(author.name, s),
        grid: jobGrid(s),
        plan: jobPlan(author.name, s),
        feedback: jobFeedback(s),
      });
    }
  };
  const addPairWorkflow = (a: any, b: any, seed: number) => {
    const id = crypto.randomUUID();
    sessionRows.push({ id, code: makeCode(), cohort: code, exercise: "workflow", host_id: a.id, guest_id: b.id, status: "done", phase: 4, phase_started_at: new Date().toISOString() });
    docRows.push({ session_id: id, ...workflowDoc(seed) });
  };

  addPairJob(users[0], users[1], 0);
  addPairJob(users[2], users[3], 1);
  addPairJob(users[4], users[5], 2);
  addPairWorkflow(users[6], users[7], 0);
  addPairWorkflow(users[8], users[9], 1);

  // Solo job (AI partner)
  {
    const id = crypto.randomUUID();
    const u = users[10];
    sessionRows.push({ id, code: makeCode(), cohort: code, exercise: "solo", host_id: u.id, status: "done", phase: 3, phase_started_at: new Date().toISOString() });
    workspaceRows.push({
      session_id: id,
      author_id: u.id,
      ...jobText(u.name, 1),
      interview_chat: soloChat(u.name),
      grid: jobGrid(1),
      plan: jobPlan(u.name, 1),
    });
  }
  // Solo workflow (AI)
  {
    const id = crypto.randomUUID();
    const u = users[11];
    sessionRows.push({ id, code: makeCode(), cohort: code, exercise: "workflow-solo", host_id: u.id, status: "done", phase: 5, phase_started_at: new Date().toISOString() });
    docRows.push({ session_id: id, ...workflowDoc(1) });
  }

  // Strategy canvases (GAS / opportunity-capability / experiment)
  const addCanvas = (u: any, exercise: string) => {
    const id = crypto.randomUUID();
    sessionRows.push({ id, code: makeCode(), cohort: code, exercise, host_id: u.id, status: "done", phase: 3, phase_started_at: new Date().toISOString() });
    workspaceRows.push({ session_id: id, author_id: u.id, canvas: canvasSeed(exercise) });
  };
  addCanvas(users[0], "gas");
  addCanvas(users[2], "ocfit");
  addCanvas(users[4], "experiment");
  addCanvas(users[7], "scorecard");
  addCanvas(users[9], "venture");

  // Career X-ray
  {
    const id = crypto.randomUUID();
    sessionRows.push({ id, code: makeCode(), cohort: code, exercise: "career-xray", host_id: users[6].id, status: "done", phase: 1, phase_started_at: new Date().toISOString() });
    workspaceRows.push({ session_id: id, author_id: users[6].id, canvas: careerSeed() });
  }

  // Negotiations — crafted strong/weak examples + a spread for the cohort plots.
  const addNeg = (u: any, exercise: string, canvas: any) => {
    const id = crypto.randomUUID();
    sessionRows.push({ id, code: makeCode(), cohort: code, exercise, host_id: u.id, status: "done", phase: 3, phase_started_at: new Date().toISOString() });
    workspaceRows.push({ session_id: id, author_id: u.id, canvas });
  };
  // "Close the Offer" (multi-issue): 2 crafted + 4 varied → scatter.
  addNeg(users[3], "negotiation", negSeed(0));
  addNeg(users[5], "negotiation", negSeed(1));
  [0, 2, 6, 8].forEach((ui) => addNeg(users[ui], "negotiation", randomOfferOutcome()));
  // "Name Your Price" (haggle): 2 crafted + 3 varied → ZOPA strip.
  addNeg(users[4], "haggle", haggleSeed(0));
  addNeg(users[10], "haggle", haggleSeed(1));
  [1, 7, 11].forEach((ui) => addNeg(users[ui], "haggle", randomHaggleOutcome()));

  // 4A diagnostic — several people so the cohort heatmap has rows.
  [1, 3, 5, 6, 8].forEach((ui, i) => {
    const id = crypto.randomUUID();
    sessionRows.push({ id, code: makeCode(), cohort: code, exercise: "four-a", host_id: users[ui].id, status: "done", phase: 3, phase_started_at: new Date().toISOString() });
    workspaceRows.push({ session_id: id, author_id: users[ui].id, canvas: fourASeed(i) });
  });

  await admin.from("sessions").insert(sessionRows);
  await admin.from("workspaces").insert(workspaceRows);
  await admin.from("workflow_docs").insert(docRows);

  return Response.json({ ok: true, cohort: code, users: users.length, sessions: sessionRows.length });
}

export async function DELETE(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!isAdmin(user.email)) return new Response("Forbidden", { status: 403 });

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return Response.json({ error: "SUPABASE_SERVICE_ROLE_KEY not set." }, { status: 500 });
  }
  const code = normalizeCode(new URL(request.url).searchParams.get("code") || "DEMOCOHORT") || "DEMOCOHORT";
  const removed = await clearCohort(admin, code);
  return Response.json({ ok: true, cohort: code, removedUsers: removed });
}
