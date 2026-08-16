import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin, UNTAGGED } from "@/lib/admin";
import { MODULES } from "@/lib/modules";
import { AI_CELLS, HUMAN_CELLS, FEEDBACK_FIELDS, Cell } from "@/lib/exercise";

export const dynamic = "force-dynamic";

export default async function Facilitator({
  searchParams,
}: {
  searchParams: { cohort?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.email)) redirect("/dashboard");

  // The facilitator view reads across all users, so it needs the service role.
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return (
      <Shell>
        <p className="text-slate-600">
          The facilitator dashboard needs the{" "}
          <code className="rounded bg-slate-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
          environment variable. Add it (Supabase → Project Settings → API →
          service_role) and redeploy.
        </p>
      </Shell>
    );
  }

  const cohort = searchParams.cohort;
  return cohort ? (
    <CohortDetail admin={admin} cohort={cohort} />
  ) : (
    <Overview admin={admin} />
  );
}

// ---------------------------------------------------------------- Overview ---
async function Overview({ admin }: { admin: any }) {
  const { data: sessions } = await admin
    .from("sessions")
    .select("id, cohort, status, host_id, guest_id, created_at")
    .order("created_at", { ascending: false });

  const groups = new Map<string, any[]>();
  for (const s of sessions || []) {
    const key = s.cohort || UNTAGGED;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }

  const rows = Array.from(groups.entries()).sort((a, b) => {
    if (a[0] === UNTAGGED) return 1;
    if (b[0] === UNTAGGED) return -1;
    return a[0] < b[0] ? -1 : 1;
  });

  return (
    <Shell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-400">Facilitator</div>
          <h1 className="text-2xl font-bold">Cohorts</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/facilitator/classes" className="btn-primary text-sm">
            Classes
          </Link>
          <Link href="/dashboard" className="btn-ghost text-sm">
            ← My dashboard
          </Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-slate-500">
          No sessions yet. Share a link like{" "}
          <code className="rounded bg-slate-100 px-1">
            /dashboard?cohort=EXECED-XYZ-DATE
          </code>{" "}
          with your cohort so their rooms are tagged.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map(([key, list]) => {
            const people = new Set<string>();
            list.forEach((s) => {
              if (s.host_id) people.add(s.host_id);
              if (s.guest_id) people.add(s.guest_id);
            });
            const done = list.filter((s) => s.status === "done").length;
            return (
              <li key={key}>
                <div className="card flex items-center justify-between px-5 py-4">
                  <Link
                    href={`/facilitator?cohort=${encodeURIComponent(key)}`}
                    className="flex-1"
                  >
                    <div className="font-mono text-lg font-semibold">
                      {key === UNTAGGED ? "(untagged)" : key}
                    </div>
                    <div className="mt-0.5 text-sm text-slate-500">
                      {list.length} {list.length === 1 ? "pair" : "pairs"} ·{" "}
                      {people.size} participants · {done} completed
                    </div>
                  </Link>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/facilitator/live?cohort=${encodeURIComponent(key)}`}
                      className="btn-ghost text-sm"
                    >
                      Live
                    </Link>
                    <Link
                      href={`/facilitator?cohort=${encodeURIComponent(key)}`}
                      className="text-slate-300"
                    >
                      →
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Shell>
  );
}

// ------------------------------------------------------------ CohortDetail ---
async function CohortDetail({ admin, cohort }: { admin: any; cohort: string }) {
  const untagged = cohort === UNTAGGED;

  let q = admin
    .from("sessions")
    .select("*")
    .order("created_at", { ascending: false });
  q = untagged ? q.is("cohort", null) : q.eq("cohort", cohort);
  const { data: sessions } = await q;

  const sessionIds = (sessions || []).map((s: any) => s.id);
  let workspaces: any[] = [];
  let docs: any[] = [];
  let profiles: any[] = [];
  if (sessionIds.length) {
    const { data: ws } = await admin
      .from("workspaces")
      .select("*")
      .in("session_id", sessionIds);
    workspaces = ws || [];
    const { data: wd } = await admin
      .from("workflow_docs")
      .select("*")
      .in("session_id", sessionIds);
    docs = wd || [];
    const ids = new Set<string>();
    (sessions || []).forEach((s: any) => {
      if (s.host_id) ids.add(s.host_id);
      if (s.guest_id) ids.add(s.guest_id);
    });
    if (ids.size) {
      const { data: ps } = await admin
        .from("profiles")
        .select("id, display_name")
        .in("id", Array.from(ids));
      profiles = ps || [];
    }
  }

  const nameOf = (id?: string | null) =>
    (id && profiles.find((p) => p.id === id)?.display_name) || "—";
  const wsFor = (sessionId: string, authorId?: string | null) =>
    workspaces.find((w) => w.session_id === sessionId && w.author_id === authorId);
  const docFor = (sessionId: string) =>
    docs.find((d) => d.session_id === sessionId);

  // ---- Class overview (only when this cohort is a class) ----
  let classOverview: any = null;
  if (!untagged) {
    const { data: klass } = await admin
      .from("classes")
      .select("id, name, modules")
      .eq("code", cohort)
      .maybeSingle();
    if (klass) {
      const [{ count: joined }, { data: bench }, { data: net }] = await Promise.all([
        admin.from("class_members").select("user_id", { count: "exact", head: true }).eq("class_id", klass.id),
        admin.from("benchmark_results").select("user_id").eq("cohort", cohort),
        admin.from("network_responses").select("user_id").eq("cohort", cohort),
      ]);
      const benchUsers = new Set((bench || []).map((r: any) => r.user_id)).size;
      const netUsers = new Set((net || []).map((r: any) => r.user_id)).size;
      const bySession = (exercise: string) => {
        const ss = (sessions || []).filter((s: any) => s.exercise === exercise);
        const users = new Set<string>();
        ss.forEach((s: any) => {
          if (s.host_id) users.add(s.host_id);
          if (s.guest_id) users.add(s.guest_id);
        });
        return users.size;
      };
      const statFor = (slug: string): number => {
        if (slug === "benchmark") return benchUsers;
        if (slug === "network") return netUsers;
        if (slug === "reimagine-job") return bySession("job");
        if (slug === "reimagine-workflow") return bySession("workflow");
        if (slug === "solo-ai") return bySession("solo");
        return 0;
      };
      classOverview = {
        name: klass.name,
        joined: joined ?? 0,
        rows: ((klass.modules as string[]) || []).map((slug) => ({
          slug,
          name: MODULES.find((m) => m.slug === slug)?.name || slug,
          count: statFor(slug),
        })),
      };
    }
  }

  return (
    <Shell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/facilitator"
            className="text-sm text-slate-400 hover:text-slate-600"
          >
            ← All cohorts
          </Link>
          <h1 className="mt-1 font-mono text-2xl font-bold">
            {untagged ? "(untagged)" : cohort}
          </h1>
          <p className="text-sm text-slate-500">
            {(sessions || []).length} pairs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/facilitator/live?cohort=${encodeURIComponent(cohort)}`}
            className="btn-ghost text-sm"
          >
            ● Live cockpit
          </Link>
          <Link
            href={`/facilitator/aggregate?cohort=${encodeURIComponent(cohort)}`}
            className="btn-ghost text-sm"
          >
            Aggregate
          </Link>
          <Link
            href={`/facilitator/benchmark?cohort=${encodeURIComponent(cohort)}`}
            className="btn-ghost text-sm"
          >
            Benchmark
          </Link>
          <Link
            href={`/facilitator/network?cohort=${encodeURIComponent(cohort)}`}
            className="btn-ghost text-sm"
          >
            Network
          </Link>
          {sessionIds.length > 0 && (
            <a
              href={`/facilitator/export?cohort=${encodeURIComponent(cohort)}`}
              className="btn-primary text-sm"
            >
              ↓ CSV
            </a>
          )}
        </div>
      </div>

      {classOverview && <ClassOverview data={classOverview} />}

      {(sessions || []).length === 0 ? (
        <p className="text-slate-500">No sessions in this cohort.</p>
      ) : (
        <div className="space-y-6">
          {(sessions || []).map((s: any) => (
            <div key={s.id} className="card p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-sm font-semibold tracking-widest">
                    {s.code}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                    {s.exercise === "workflow" ? "workflow" : "job"}
                  </span>
                  <span className="text-sm text-slate-600">
                    {nameOf(s.host_id)}{" "}
                    <span className="text-slate-300">&amp;</span>{" "}
                    {s.guest_id ? nameOf(s.guest_id) : "— (no partner)"}
                  </span>
                </div>
                <span
                  className={
                    "rounded-full px-2.5 py-1 text-xs font-medium " +
                    (s.status === "done"
                      ? "bg-green-100 text-green-700"
                      : s.status === "active"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-slate-100 text-slate-600")
                  }
                >
                  {s.status}
                </span>
              </div>

              {s.exercise === "workflow" ? (
                <WorkflowView doc={docFor(s.id)} />
              ) : s.exercise === "solo" ? (
                <SoloView authorName={nameOf(s.host_id)} ws={wsFor(s.id, s.host_id)} />
              ) : (
                <div className="grid gap-5 md:grid-cols-2">
                  <ParticipantColumn
                    authorName={nameOf(s.host_id)}
                    subjectName={nameOf(s.guest_id)}
                    ws={wsFor(s.id, s.host_id)}
                  />
                  <ParticipantColumn
                    authorName={nameOf(s.guest_id)}
                    subjectName={nameOf(s.host_id)}
                    ws={wsFor(s.id, s.guest_id)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}

function ParticipantColumn({
  authorName,
  subjectName,
  ws,
}: {
  authorName: string;
  subjectName: string;
  ws: any;
}) {
  if (!ws) {
    return (
      <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-400">
        {authorName} — no data.
      </div>
    );
  }
  const grid = ws.grid || {};
  const fb = ws.feedback || {};
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="text-sm font-bold text-slate-800">{authorName}</div>

      <Field label="Their job today">
        {ws.owner_job_title && <span className="font-medium">{ws.owner_job_title}. </span>}
        {ws.owner_job_description}
      </Field>

      <div className="my-3 border-t border-slate-100 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {authorName}&apos;s redesign of {subjectName}
      </div>

      <Field label="Strategic outcome">{ws.strategic_outcome}</Field>
      <Field label="Their real job">{ws.real_job}</Field>
      <Field label="Insight">{ws.insight}</Field>

      <GridBlock label="Give to AI" role="ai" cells={AI_CELLS} grid={grid} />
      <GridBlock label="Keep human" role="human" cells={HUMAN_CELLS} grid={grid} />

      <Field label="New job description">{ws.new_job_description}</Field>
      <Field label="Final reimagined job">{ws.final_description}</Field>

      {FEEDBACK_FIELDS.some((f) => (fb[f.key] || "").trim()) && (
        <div className="mt-3">
          <div className="mb-1 text-xs font-semibold text-slate-500">
            Feedback received
          </div>
          <div className="space-y-1">
            {FEEDBACK_FIELDS.map((f) =>
              (fb[f.key] || "").trim() ? (
                <div key={f.key} className="flex gap-2 text-sm">
                  <span
                    className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ backgroundColor: f.color }}
                  >
                    {f.symbol}
                  </span>
                  <span className="text-slate-600">{fb[f.key]}</span>
                </div>
              ) : null
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ClassOverview({ data }: { data: any }) {
  const joined = data.joined || 0;
  return (
    <div className="card mb-6 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-lg font-bold text-ink">{data.name}</div>
        <div className="text-sm text-slate-500">
          <span className="text-2xl font-bold text-ink">{joined}</span> joined
        </div>
      </div>
      <div className="mt-4 space-y-2.5">
        {data.rows.map((r: any) => {
          const pct = joined ? Math.min(100, Math.round((r.count / joined) * 100)) : 0;
          return (
            <div key={r.slug} className="flex items-center gap-3">
              <div className="w-40 shrink-0 truncate text-sm text-slate-600">{r.name}</div>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-sage" style={{ width: `${pct}%` }} />
              </div>
              <div className="w-24 shrink-0 text-right text-sm text-slate-600">
                <span className="font-semibold text-ink">{r.count}</span>
                {joined ? <span className="text-slate-400"> / {joined}</span> : ""}
              </div>
            </div>
          );
        })}
        {data.rows.length === 0 && (
          <div className="text-sm text-slate-400">No modules in this class yet.</div>
        )}
      </div>
    </div>
  );
}

function SoloView({ authorName, ws }: { authorName: string; ws: any }) {
  if (!ws) {
    return (
      <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-400">
        {authorName} — no data.
      </div>
    );
  }
  const chat: any[] = ws.interview_chat || [];
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <ParticipantColumn authorName={authorName} subjectName="their own job" ws={ws} />
      <div className="rounded-xl border border-slate-200 p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          AI interview transcript
        </div>
        {chat.length === 0 ? (
          <div className="mt-2 text-sm text-slate-300">— none —</div>
        ) : (
          <div className="mt-2 space-y-2">
            {chat.map((m, i) => (
              <div key={i} className="text-sm">
                <span className={m.role === "user" ? "font-semibold text-slate-700" : "font-semibold text-ai"}>
                  {m.role === "user" ? `${authorName}: ` : "AI: "}
                </span>
                <span className="text-slate-600">{m.content}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WorkflowView({ doc }: { doc: any }) {
  if (!doc) {
    return (
      <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-400">
        No workflow data yet.
      </div>
    );
  }
  const steps: any[] = doc.steps || [];
  const roleColor: Record<string, string> = {
    ai: "#2563eb",
    human: "#ea580c",
    both: "#7c3aed",
  };
  const roleLabel: Record<string, string> = { ai: "AI", human: "Human", both: "Both" };
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="rounded-xl border border-slate-200 p-4">
        <div className="text-sm font-bold text-slate-800">{doc.name || "—"}</div>
        <Field label="Why redesign">{doc.why}</Field>
        <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Steps
        </div>
        <div className="mt-1 space-y-1">
          {steps.length === 0 ? (
            <span className="text-slate-300">—</span>
          ) : (
            steps.map((st, i) => (
              <div key={st.id || i} className="flex items-center gap-2 text-sm">
                <span className="w-5 text-right text-slate-400">{i + 1}</span>
                <span className="flex-1 text-slate-700">{st.text}</span>
                {st.role && (
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                    style={{ backgroundColor: roleColor[st.role] || "#94a3b8" }}
                  >
                    {roleLabel[st.role] || st.role}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 p-4">
        <Field label="Success">{doc.success}</Field>
        <Field label="Failure">{doc.failure}</Field>
        <Field label="More">{doc.more}</Field>
        <Field label="Better">{doc.better}</Field>
        <Field label="Accuracy">{doc.accuracy}</Field>
        <Field label="Generality">{doc.generality}</Field>
        <Field label="Chaos">{doc.chaos}</Field>
        <Field label="Architect">{doc.architect}</Field>
        <Field label="Stop / Start">{doc.stop_start}</Field>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: any }) {
  const empty =
    children == null ||
    (typeof children === "string" && children.trim() === "") ||
    (Array.isArray(children) && children.join("").trim() === "");
  return (
    <div className="mt-2 text-sm">
      <span className="font-medium text-slate-500">{label}: </span>
      {empty ? (
        <span className="text-slate-300">—</span>
      ) : (
        <span className="whitespace-pre-wrap text-slate-700">{children}</span>
      )}
    </div>
  );
}

function GridBlock({
  label,
  role,
  cells,
  grid,
}: {
  label: string;
  role: "ai" | "human";
  cells: Cell[];
  grid: Record<string, string[]>;
}) {
  const pairs = cells
    .map((c) => ({ label: c.label, items: grid[c.key] || [] }))
    .filter((x) => x.items.length > 0);
  const accent = role === "ai" ? "text-ai" : "text-human";
  return (
    <div className="mt-2 text-sm">
      <div className={"font-semibold " + accent}>{label}</div>
      {pairs.length === 0 ? (
        <span className="text-slate-300">—</span>
      ) : (
        <div className="mt-0.5 space-y-1">
          {pairs.map((p) => (
            <div key={p.label}>
              <span className="font-medium text-slate-600">{p.label}</span>
              <ul className="mt-0.5 space-y-0.5">
                {p.items.map((it, i) => (
                  <li key={i} className="flex gap-1.5 text-slate-500">
                    <span className="text-slate-300">•</span>
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Shell({ children }: { children: any }) {
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>;
}
