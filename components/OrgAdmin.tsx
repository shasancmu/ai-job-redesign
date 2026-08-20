"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MODULES } from "@/lib/modules";

const PICKABLE = MODULES.filter((m) => !m.hidden);

type Highlight = { title: string; body: string };
type Faculty = { name: string; title?: string; image_url?: string };
type User = { id: string; email: string; name: string };
type Org = { id: string; slug: string; name: string; tagline: string | null; primary_color: string | null; logo_url: string | null; hero_image_url: string | null; invite_only: boolean; modules: string[] | null; about: string | null; highlights: Highlight[] | null; faculty: Faculty[] | null };
type Invite = { email: string; org_role: string };

// Upload a faculty photo to the shared branding bucket; returns its public URL.
async function uploadPhoto(orgId: string, file: File): Promise<string> {
  const blob = await downscale(file, 480);
  const fd = new FormData();
  fd.set("orgId", orgId); fd.set("kind", "faculty");
  fd.set("file", new File([blob], file.name, { type: blob.type || file.type }));
  const res = await fetch("/api/admin/orgs/asset", { method: "POST", body: fd });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error || "Upload failed");
  return d.url as string;
}

async function post(body: any) {
  const res = await fetch("/api/admin/orgs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error || "Failed");
  return d;
}

// Shrink an image in the browser before upload so it never exceeds the
// serverless request-body limit. SVGs and already-small files pass through.
async function downscale(file: File, maxDim: number): Promise<Blob> {
  if (file.type === "image/svg+xml" || file.size < 250 * 1024) return file;
  try {
    const img = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
    const isPng = file.type.includes("png"); // keep transparency for logos
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, isPng ? "image/png" : "image/jpeg", 0.85));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

export default function OrgAdmin({ orgs, counts, invitesByOrg, users = [] }: { orgs: Org[]; counts: Record<string, { facilitators: number; members: number }>; invitesByOrg: Record<string, Invite[]>; users?: User[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-4">
      {!creating ? (
        <button onClick={() => setCreating(true)} className="btn-primary text-sm">+ New organization</button>
      ) : (
        <OrgForm onDone={() => { setCreating(false); router.refresh(); }} onCancel={() => setCreating(false)} />
      )}

      {orgs.length === 0 && !creating && <p className="text-sm text-slate-400">No organizations yet.</p>}

      {orgs.map((o) => (
        <OrgCard key={o.id} org={o} count={counts[o.id]} invites={invitesByOrg[o.id] || []} users={users} onChanged={() => router.refresh()} />
      ))}
    </div>
  );
}

function OrgForm({ org, onDone, onCancel }: { org?: Org; onDone: () => void; onCancel: () => void }) {
  const [slug, setSlug] = useState(org?.slug || "");
  const [name, setName] = useState(org?.name || "");
  const [tagline, setTagline] = useState(org?.tagline || "");
  const [color, setColor] = useState(org?.primary_color || "#3f7a52");
  const [inviteOnly, setInviteOnly] = useState(org?.invite_only ?? true);
  const [mods, setMods] = useState<Set<string>>(new Set(org?.modules || []));
  const [about, setAbout] = useState(org?.about || "");
  const [highlights, setHighlights] = useState<Highlight[]>(org?.highlights || []);
  const [faculty, setFaculty] = useState<Faculty[]>(org?.faculty || []);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toggleMod = (slug: string) => setMods((s) => { const n = new Set(s); n.has(slug) ? n.delete(slug) : n.add(slug); return n; });

  async function save() {
    setBusy(true); setErr(null);
    try {
      await post({
        action: "save_org", id: org?.id, slug, name, tagline, primary_color: color, invite_only: inviteOnly, modules: [...mods],
        about,
        highlights: highlights.filter((h) => h.title.trim() || h.body.trim()),
        faculty: faculty.filter((f) => f.name.trim()),
      });
      onDone();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="card space-y-3 p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="lbl">Slug (URL)</label>
          <div className="flex items-center gap-1 text-sm">
            <span className="text-slate-400">superadditive.app/</span>
            <input className="field" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="duke" disabled={!!org} />
          </div>
        </div>
        <div>
          <label className="lbl">Name</label>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Duke University" />
        </div>
      </div>
      <div>
        <label className="lbl">Tagline <span className="font-normal text-slate-400">(landing headline)</span></label>
        <input className="field" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="AI for Duke's leaders and teams" />
      </div>
      <div>
        <label className="lbl">About <span className="font-normal text-slate-400">(short intro under the headline)</span></label>
        <textarea className="field min-h-[70px]" value={about} onChange={(e) => setAbout(e.target.value)} placeholder="A private Superadditive workspace for Duke — hands-on exercises for your teams." />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <span className="lbl mb-0">Brand color</span>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-12 cursor-pointer rounded border border-line" />
          <span className="font-mono text-xs text-slate2">{color}</span>
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={inviteOnly} onChange={(e) => setInviteOnly(e.target.checked)} className="h-4 w-4 accent-[color:var(--ink)]" />
          Invite-only
        </label>
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="lbl mb-0">Modules members can access</label>
          <div className="flex gap-2 text-xs">
            <button type="button" onClick={() => setMods(new Set(PICKABLE.map((m) => m.slug)))} className="text-sky hover:underline">All</button>
            <button type="button" onClick={() => setMods(new Set())} className="text-slate-400 hover:text-ink">None</button>
          </div>
        </div>
        <div className="mb-1.5 text-xs text-slate-400">{mods.size === 0 ? "Empty = members get every module." : `${mods.size} selected — members get only these.`}</div>
        <div className="flex max-h-52 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-line p-2">
          {PICKABLE.map((m) => (
            <button key={m.slug} type="button" onClick={() => toggleMod(m.slug)} className={"rounded-full px-2.5 py-1 text-xs font-medium transition " + (mods.has(m.slug) ? "bg-ink text-white" : "bg-mist text-slate2 hover:bg-slate-200")}>
              {m.name}
            </button>
          ))}
        </div>
      </div>
      {/* Institution factors */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="lbl mb-0">Highlights <span className="font-normal text-slate-400">(the &ldquo;why us&rdquo; cards)</span></label>
          <button type="button" onClick={() => setHighlights((h) => [...h, { title: "", body: "" }])} className="text-xs text-sky hover:underline">+ Add</button>
        </div>
        {highlights.length === 0 && <div className="mb-1.5 text-xs text-slate-400">Empty = tasteful placeholder cards show on the page.</div>}
        <div className="space-y-2">
          {highlights.map((h, i) => (
            <div key={i} className="rounded-lg border border-line p-2.5">
              <div className="flex items-center gap-1.5">
                <input className="field" value={h.title} placeholder="Card title" onChange={(e) => setHighlights((arr) => arr.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} />
                <button type="button" onClick={() => setHighlights((arr) => arr.filter((_, j) => j !== i))} className="shrink-0 text-slate-400 hover:text-clay">✕</button>
              </div>
              <textarea className="field mt-1.5 min-h-[54px]" value={h.body} placeholder="One or two sentences." onChange={(e) => setHighlights((arr) => arr.map((x, j) => j === i ? { ...x, body: e.target.value } : x))} />
            </div>
          ))}
        </div>
      </div>

      {/* Key faculty */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="lbl mb-0">Faculty &amp; facilitators <span className="font-normal text-slate-400">(shown as circles)</span></label>
          <button type="button" onClick={() => setFaculty((f) => [...f, { name: "" }])} className="text-xs text-sky hover:underline">+ Add person</button>
        </div>
        {faculty.length === 0 && <div className="mb-1.5 text-xs text-slate-400">Empty = placeholder circles show on the page.</div>}
        <div className="space-y-2">
          {faculty.map((f, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-line p-2.5">
              <FacultyPhoto org={org} person={f} onUrl={(url) => setFaculty((arr) => arr.map((x, j) => j === i ? { ...x, image_url: url } : x))} />
              <div className="flex-1 space-y-1.5">
                <input className="field" value={f.name} placeholder="Full name" onChange={(e) => setFaculty((arr) => arr.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                <input className="field" value={f.title || ""} placeholder="Title (optional)" onChange={(e) => setFaculty((arr) => arr.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} />
              </div>
              <button type="button" onClick={() => setFaculty((arr) => arr.filter((_, j) => j !== i))} className="shrink-0 self-start text-slate-400 hover:text-clay">✕</button>
            </div>
          ))}
        </div>
      </div>

      {err && <p className="text-sm text-clay">{err}</p>}
      <div className="flex gap-2">
        <button onClick={save} disabled={busy || !slug || !name} className="btn-primary text-sm">{busy ? "Saving…" : org ? "Save" : "Create"}</button>
        <button onClick={onCancel} className="btn-ghost text-sm">Cancel</button>
      </div>
    </div>
  );
}

function OrgCard({ org, count, invites, users, onChanged }: { org: Org; count?: { facilitators: number; members: number }; invites: Invite[]; users: User[]; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [memEmails, setMemEmails] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function upload(kind: "logo" | "hero", file: File) {
    setBusy(kind); setErr(null);
    try {
      const blob = await downscale(file, kind === "hero" ? 1800 : 640);
      const fd = new FormData();
      fd.set("orgId", org.id); fd.set("kind", kind);
      fd.set("file", new File([blob], file.name, { type: blob.type || file.type }));
      const res = await fetch("/api/admin/orgs/asset", { method: "POST", body: fd });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(/entity too large/i.test(t) ? "That image is too large even after resizing. Try a smaller one." : (t.trim().slice(0, 140) || `Upload failed (${res.status})`));
      }
      await res.json().catch(() => ({}));
      onChanged();
    } catch (e: any) { setErr(e.message || "Upload failed"); } finally { setBusy(null); }
  }
  async function act(body: any, tag: string) {
    setBusy(tag); setErr(null);
    try { await post(body); onChanged(); } catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }

  if (editing) return <OrgForm org={org} onDone={() => { setEditing(false); onChanged(); }} onCancel={() => setEditing(false)} />;

  const facs = invites.filter((i) => i.org_role === "facilitator");
  const mems = invites.filter((i) => i.org_role === "member");

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {org.logo_url ? <img src={org.logo_url} alt="" className="h-8 max-w-[120px] object-contain" /> : <span className="h-6 w-6 rounded-full" style={{ background: org.primary_color || "#3f7a52" }} />}
          <div>
            <div className="font-bold text-ink">{org.name}</div>
            <div className="text-xs text-slate-400">superadditive.app/{org.slug} · {count?.facilitators || 0} facilitator(s), {count?.members || 0} member(s) · {org.invite_only ? "invite-only" : "open"}</div>
          </div>
        </div>
        <div className="flex gap-2">
          <a href={`/${org.slug}`} target="_blank" rel="noopener noreferrer" className="btn-ghost text-sm">Preview ↗</a>
          <button onClick={() => setEditing(true)} className="btn-ghost text-sm">Edit</button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {/* Assets */}
        <div className="rounded-lg border border-line p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Branding</div>
          <div className="flex flex-wrap gap-3 text-sm">
            <label className="cursor-pointer text-sky hover:underline">
              {busy === "logo" ? "Uploading…" : org.logo_url ? "Replace logo" : "Upload logo"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload("logo", e.target.files[0])} />
            </label>
            <label className="cursor-pointer text-sky hover:underline">
              {busy === "hero" ? "Uploading…" : org.hero_image_url ? "Replace hero" : "Upload hero"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload("hero", e.target.files[0])} />
            </label>
          </div>
        </div>

        {/* Facilitator */}
        <div className="rounded-lg border border-line p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Facilitator</div>
          <UserLookup
            users={users}
            busy={busy === "fac"}
            exclude={new Set(facs.map((f) => f.email))}
            onPick={(email) => act({ action: "set_facilitator", orgId: org.id, email }, "fac")}
          />
          {facs.length > 0 && <div className="mt-1.5 text-xs text-slate2">{facs.map((f) => f.email).join(", ")}</div>}
        </div>
      </div>

      {/* Member invites */}
      <div className="mt-4 rounded-lg border border-line p-3">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Invited members {org.invite_only ? "" : "(org is open — anyone can join)"}</div>
        <div className="flex gap-1.5">
          <input className="field" value={memEmails} onChange={(e) => setMemEmails(e.target.value)} placeholder="a@duke.edu, b@duke.edu" />
          <button onClick={() => act({ action: "add_invites", orgId: org.id, emails: memEmails.split(/[,\s]+/).filter(Boolean) }, "mem").then(() => setMemEmails(""))} disabled={busy === "mem" || !memEmails.includes("@")} className="btn-dark shrink-0 text-sm">Invite</button>
        </div>
        {mems.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {mems.map((m) => (
              <span key={m.email} className="inline-flex items-center gap-1 rounded-full bg-mist px-2 py-0.5 text-xs text-slate2">
                {m.email}
                <button onClick={() => act({ action: "remove_invite", orgId: org.id, email: m.email }, "rm")} className="text-slate-400 hover:text-clay">✕</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {err && <p className="mt-3 text-sm text-clay">{err}</p>}
    </div>
  );
}

// A round avatar with an upload affordance for one faculty member. Photos need
// the org to exist first (uploads are keyed by org id), so on a brand-new org
// it shows initials only until the org is saved.
function FacultyPhoto({ org, person, onUrl }: { org?: Org; person: Faculty; onUrl: (url: string) => void }) {
  const [busy, setBusy] = useState(false);
  const initials = (person.name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("") || "•";

  async function pick(file: File) {
    if (!org?.id) return;
    setBusy(true);
    try { onUrl(await uploadPhoto(org.id, file)); } catch { /* surfaced elsewhere */ } finally { setBusy(false); }
  }

  const circle = person.image_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={person.image_url} alt="" className="h-11 w-11 rounded-full object-cover" />
  ) : (
    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-mist text-xs font-bold text-slate2">{busy ? "…" : initials}</span>
  );

  if (!org?.id) return <div title="Save the org first to add photos" className="shrink-0">{circle}</div>;
  return (
    <label className="shrink-0 cursor-pointer" title="Upload photo">
      {circle}
      <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
    </label>
  );
}

function initialsOf(name: string) {
  return (name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("") || "?";
}

// Typeahead over every account in the system: type a name or email, pick a
// person to make them a facilitator. Typing a full email that isn't in the
// system offers to invite it (so you can pre-assign someone before they sign up).
function UserLookup({ users, onPick, busy, exclude }: { users: User[]; onPick: (email: string) => void; busy?: boolean; exclude?: Set<string> }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const query = q.trim().toLowerCase();

  const matches = query
    ? users.filter((u) => !exclude?.has(u.email) && (u.name.toLowerCase().includes(query) || u.email.includes(query))).slice(0, 8)
    : [];
  const showRawInvite = query.includes("@") && !matches.some((m) => m.email === query) && !exclude?.has(query);

  function pick(email: string) {
    onPick(email);
    setQ("");
    setOpen(false);
  }

  return (
    <div className="relative">
      <input
        className="field"
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Search people by name or email…"
        disabled={busy}
      />
      {open && query && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-line bg-white p-1 shadow-lift">
            {matches.map((u) => (
              <button key={u.id} type="button" onClick={() => pick(u.email)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-mist">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-mist text-[10px] font-bold text-slate2">{initialsOf(u.name)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-ink">{u.name}</span>
                  <span className="block truncate text-xs text-slate-400">{u.email}</span>
                </span>
              </button>
            ))}
            {showRawInvite && (
              <button type="button" onClick={() => pick(query)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-mist">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-mist text-base text-slate-400">+</span>
                <span className="text-sm text-ink">Invite <b>{query}</b></span>
              </button>
            )}
            {matches.length === 0 && !showRawInvite && (
              <div className="px-2.5 py-2 text-sm text-slate-400">No matching accounts. Type a full email to invite someone new.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
