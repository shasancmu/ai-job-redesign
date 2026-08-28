"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { TeamPerson, TeamInvite } from "@/app/team/page";

export type StaffLink = { token: string; domain: string | null };

function initials(name: string) {
  return (name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("") || "?";
}

async function post(body: any) {
  const res = await fetch("/api/team", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error || "Failed");
  return d;
}

export default function TeamConsole({ orgId, people, invites, links = [], isSuperadmin = false }: { orgId: string; people: TeamPerson[]; invites: TeamInvite[]; links?: StaffLink[]; isSuperadmin?: boolean }) {
  const router = useRouter();
  const [emails, setEmails] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "instructor">("member");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [linkDomain, setLinkDomain] = useState("");
  const [copied, setCopied] = useState("");
  useEffect(() => { setOrigin(window.location.origin); }, []);

  async function act(body: any, tag: string) {
    setBusy(tag); setErr(null);
    try { await post({ orgId, ...body }); router.refresh(); }
    catch (e: any) { setErr(e.message); }
    finally { setBusy(null); }
  }

  function makeDirector(p: TeamPerson) {
    if (!confirm(`Make ${p.name} a co-director? Directors manage everyone and every class in this organization. Only a superadmin can undo it.`)) return;
    act({ action: "set_role", userId: p.userId, role: "director" }, p.userId);
  }
  function copyLink(token: string) {
    const url = `${origin}/staff/${token}`;
    navigator.clipboard?.writeText(url); setCopied(token); setTimeout(() => setCopied(""), 1500);
  }

  const directors = people.filter((p) => p.role === "director");
  const instructors = people.filter((p) => p.role === "instructor");
  const members = people.filter((p) => p.role === "member");

  const Row = ({ p, children }: { p: TeamPerson; children?: React.ReactNode }) => (
    <div className="flex items-center gap-3 rounded-lg border border-line bg-white p-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mist text-[11px] font-bold text-slate2">{initials(p.name)}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink">{p.name}</span>
        <span className="block truncate text-xs text-slate-400">{p.email}</span>
      </span>
      <div className="flex shrink-0 items-center gap-1.5">{children}</div>
    </div>
  );

  const Section = ({ title, hint, anchor, children }: { title: string; hint?: string; anchor?: string; children: React.ReactNode }) => (
    <section className="mt-6" data-tour={anchor}>
      <div className="mb-2 flex items-baseline gap-2">
        <h2 className="eyebrow">{title}</h2>
        {hint && <span className="text-xs text-slate-400">{hint}</span>}
      </div>
      <div className="space-y-1.5">{children}</div>
    </section>
  );

  const btn = "rounded-full border border-line bg-white px-2.5 py-1 text-xs font-medium text-slate2 transition hover:border-slate-300 hover:text-ink disabled:opacity-50";

  return (
    <div>
      {/* Invite */}
      <div className="card p-4" data-tour="team-add">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Add people</div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="field flex-1"
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            placeholder="name@company.com, another@company.com"
          />
          <div className="flex gap-2">
            <select className="field w-auto" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as any)}>
              <option value="member">as Members</option>
              <option value="instructor">as Instructors</option>
            </select>
            <button
              onClick={() => act({ action: "invite", role: inviteRole, emails: emails.split(/[,\s]+/).filter(Boolean) }, "invite").then(() => setEmails(""))}
              disabled={busy === "invite" || !emails.includes("@")}
              className="btn-dark shrink-0 text-sm"
            >
              {busy === "invite" ? "Adding…" : "Add"}
            </button>
          </div>
        </div>
        <p className="mt-1.5 text-xs text-slate-400">They join instantly if they already have an account, otherwise on their next sign-in.</p>
        {err && <p className="mt-2 text-sm text-clay">{err}</p>}
      </div>

      {/* Staff invite link */}
      <div className="card mt-3 p-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Instructor invite link</div>
        <p className="mb-2 text-xs text-slate-400">Share a link that makes anyone who opens it an instructor. Add a domain to restrict it (e.g. only <span className="font-mono">duke.edu</span> emails).</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input className="field flex-1" value={linkDomain} onChange={(e) => setLinkDomain(e.target.value)} placeholder="Restrict to domain (optional), e.g. duke.edu" />
          <button onClick={() => act({ action: "staff_link", domain: linkDomain.trim() }, "staff_link").then(() => setLinkDomain(""))} disabled={busy === "staff_link"} className="btn-dark shrink-0 text-sm">{busy === "staff_link" ? "Creating…" : "Create link"}</button>
        </div>
        {links.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {links.map((l) => (
              <div key={l.token} className="flex items-center gap-2 rounded-lg border border-line bg-white p-2 text-sm">
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate2">{origin}/staff/{l.token}</span>
                {l.domain && <span className="shrink-0 rounded-full bg-mist px-2 py-0.5 text-[10px] text-slate2">@{l.domain}</span>}
                <button onClick={() => copyLink(l.token)} className={btn}>{copied === l.token ? "Copied" : "Copy"}</button>
                <button onClick={() => act({ action: "revoke_link", token: l.token }, l.token)} disabled={busy === l.token} className={btn + " hover:!text-clay"}>Revoke</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {directors.length > 0 && (
        <Section title="Directors" hint={isSuperadmin ? "you can change these" : "managed by the platform admin"}>
          {directors.map((p) => (
            <Row key={p.userId} p={p}>
              {isSuperadmin ? (
                <>
                  <button onClick={() => act({ action: "set_role", userId: p.userId, role: "instructor" }, p.userId)} disabled={busy === p.userId} className={btn}>Make instructor</button>
                  <button onClick={() => { if (confirm(`Remove ${p.name} from this organization? They lose director access here.`)) act({ action: "remove", userId: p.userId }, p.userId); }} disabled={busy === p.userId} className={btn + " hover:!text-clay"}>Remove</button>
                </>
              ) : (
                <span className="rounded-full bg-mist px-2 py-0.5 text-[10px] text-slate2">director</span>
              )}
            </Row>
          ))}
        </Section>
      )}

      <Section title="Instructors" anchor="team-instructors" hint={instructors.length ? undefined : "none yet — promote a member or add one above"}>
        {instructors.map((p) => (
          <Row key={p.userId} p={p}>
            <button onClick={() => makeDirector(p)} disabled={busy === p.userId} className={btn}>Make director</button>
            <button onClick={() => act({ action: "set_role", userId: p.userId, role: "member" }, p.userId)} disabled={busy === p.userId} className={btn}>Make member</button>
            <button onClick={() => act({ action: "remove", userId: p.userId }, p.userId)} disabled={busy === p.userId} className={btn + " hover:!text-clay"}>Remove</button>
          </Row>
        ))}
      </Section>

      <Section title="Members" anchor="team-members" hint={`${members.length} ${members.length === 1 ? "learner" : "learners"}`}>
        {members.length === 0 && <p className="text-sm text-slate2">No members yet. Add people above.</p>}
        {members.map((p) => (
          <Row key={p.userId} p={p}>
            <button onClick={() => act({ action: "set_role", userId: p.userId, role: "instructor" }, p.userId)} disabled={busy === p.userId} className={btn}>Make instructor</button>
            <button onClick={() => makeDirector(p)} disabled={busy === p.userId} className={btn}>Make director</button>
            <button onClick={() => act({ action: "remove", userId: p.userId }, p.userId)} disabled={busy === p.userId} className={btn + " hover:!text-clay"}>Remove</button>
          </Row>
        ))}
      </Section>

      {invites.length > 0 && (
        <Section title="Pending invites" hint="not signed up yet">
          {invites.map((i) => (
            <div key={i.email} className="flex items-center gap-3 rounded-lg border border-dashed border-line p-2.5">
              <span className="min-w-0 flex-1 truncate text-sm text-slate2">{i.email}</span>
              <span className="rounded-full bg-mist px-2 py-0.5 text-[10px] text-slate2">{i.role}</span>
              <button onClick={() => act({ action: "remove_invite", email: i.email }, i.email)} disabled={busy === i.email} className="text-slate-400 hover:text-clay">✕</button>
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}
