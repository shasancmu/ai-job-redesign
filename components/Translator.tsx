"use client";

import { useState } from "react";

type Person = { role: string; bio: string };
type Result = { translation: string; analogy: string; soWhat: string } | null;

const EXAMPLES = [
  { a: "Salesperson", b: "Software engineer", idea: "Customers keep telling me they'll pay more if the app just felt faster." },
  { a: "Sociologist", b: "Economist", idea: "Adoption is driven by status hierarchies, not individual choice." },
  { a: "Molecular biologist", b: "Philosopher", idea: "We can now edit the human germline reliably." },
  { a: "Engineer", b: "Marketing manager", idea: "We built a distributed cache that holds 10ms p99 latency at scale." },
];

// The cross-frame translator prototype: two people (a role, optionally a
// background), an idea, and a direction. The AI re-expresses the idea in the
// recipient's frame, both ways.
export default function Translator() {
  const [a, setA] = useState<Person>({ role: "", bio: "" });
  const [b, setB] = useState<Person>({ role: "", bio: "" });
  const [idea, setIdea] = useState("");
  const [dir, setDir] = useState<"ab" | "ba">("ab"); // who is speaking
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result>(null);
  const [err, setErr] = useState("");

  const sender = dir === "ab" ? a : b;
  const recipient = dir === "ab" ? b : a;
  const senderLabel = (dir === "ab" ? a.role : b.role) || (dir === "ab" ? "Person A" : "Person B");
  const recipientLabel = (dir === "ab" ? b.role : a.role) || (dir === "ab" ? "Person B" : "Person A");

  function loadExample(e: typeof EXAMPLES[number]) {
    setA({ role: e.a, bio: "" }); setB({ role: e.b, bio: "" }); setIdea(e.idea); setDir("ab"); setRes(null); setErr("");
  }

  async function translate() {
    if (!idea.trim()) { setErr("Type an idea."); return; }
    if (!sender.role.trim() || !recipient.role.trim()) { setErr("Give both people a role or field."); return; }
    setBusy(true); setErr(""); setRes(null);
    try {
      const d = await fetch("/api/translate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderRole: sender.role, senderBio: sender.bio, recipientRole: recipient.role, recipientBio: recipient.bio, idea }),
      }).then((r) => r.json());
      if (d?.translation) setRes({ translation: d.translation, analogy: d.analogy || "", soWhat: d.soWhat || "" });
      else setErr(d?.error || "Couldn't translate.");
    } catch { setErr("Something went wrong."); }
    setBusy(false);
  }

  const PersonCard = ({ p, set, label }: { p: Person; set: (v: Person) => void; label: string }) => (
    <div className="rounded-2xl border border-line bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <input className="field mt-2" value={p.role} onChange={(e) => set({ ...p, role: e.target.value })} placeholder="Role or field (e.g. software engineer, economist)" />
      <textarea className="field mt-2 min-h-[64px] text-sm" value={p.bio} onChange={(e) => set({ ...p, bio: e.target.value })} placeholder="Optional: paste their background or résumé, to sharpen the analogies to their actual work." />
    </div>
  );

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-slate-400">Try:</span>
        {EXAMPLES.map((e, i) => (
          <button key={i} onClick={() => loadExample(e)} className="rounded-full border border-line bg-white px-2.5 py-1 text-xs text-slate2 transition hover:border-slate-300 hover:text-ink">{e.a} → {e.b}</button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <PersonCard p={a} set={setA} label="Person A" />
        <PersonCard p={b} set={setB} label="Person B" />
      </div>

      <div className="mt-5 rounded-2xl border border-line bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Speaking as</span>
          <div className="flex rounded-full border border-line bg-mist/40 p-0.5 text-xs font-semibold">
            <button onClick={() => setDir("ab")} className={"rounded-full px-3 py-1 transition " + (dir === "ab" ? "bg-ink text-white" : "text-slate-500 hover:text-ink")}>{a.role || "Person A"}</button>
            <button onClick={() => setDir("ba")} className={"rounded-full px-3 py-1 transition " + (dir === "ba" ? "bg-ink text-white" : "text-slate-500 hover:text-ink")}>{b.role || "Person B"}</button>
          </div>
          <span className="text-xs text-slate-400">→ heard by {recipientLabel}</span>
        </div>
        <textarea className="field mt-3 min-h-[90px]" value={idea} onChange={(e) => setIdea(e.target.value)} placeholder={`Type an idea as the ${senderLabel.toLowerCase()}…`} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) translate(); }} />
        <div className="mt-3 flex items-center gap-2">
          <button onClick={translate} disabled={busy} className="btn-primary text-sm">{busy ? "Translating…" : "Translate →"}</button>
          <span className="text-xs text-slate-400">⌘/Ctrl + Enter</span>
        </div>
        {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
      </div>

      {res && (
        <div className="mt-4 rounded-2xl border border-sage/30 bg-sage-soft/30 p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-sage">As {recipientLabel} would hear it</div>
          <p className="mt-2 text-[15px] leading-relaxed text-ink">{res.translation}</p>
          {res.analogy && <p className="mt-3 text-sm text-slate2"><span className="font-semibold text-ink">In their terms:</span> {res.analogy}</p>}
          {res.soWhat && (
            <div className="mt-3 rounded-xl border border-line bg-white p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">So what, for you</div>
              <p className="mt-1 text-sm leading-relaxed text-ink">{res.soWhat}</p>
            </div>
          )}
          <p className="mt-3 border-t border-line/60 pt-3 text-xs text-slate-400"><span className="font-medium text-slate-500">{senderLabel} said:</span> {idea}</p>
        </div>
      )}
    </div>
  );
}
