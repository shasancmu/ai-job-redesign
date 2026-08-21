"use client";

import { useState } from "react";

export default function ContactForm({ source = "contact" }: { source?: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [org, setOrg] = useState("");
  const [message, setMessage] = useState("");
  const [hp, setHp] = useState(""); // honeypot
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, org, message, source, company_website: hp }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(d.error || "Couldn't send your message."); setBusy(false); return; }
      setSent(true);
    } catch { setErr("Couldn't send your message."); setBusy(false); }
  }

  if (sent) {
    return (
      <div className="card p-8 text-center">
        <div className="text-3xl" aria-hidden>✅</div>
        <h2 className="mt-3 text-xl font-bold text-ink">Thanks — we&apos;ve got it.</h2>
        <p className="mt-1 text-slate2">We&apos;ll get back to you at {email || "your email"} soon.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-6">
      {/* Honeypot: hidden from people, tempting to bots. */}
      <input tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} name="company_website" className="hidden" aria-hidden />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="lbl">Your name</label>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
        </div>
        <div>
          <label className="lbl">Email</label>
          <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@company.com" required />
        </div>
      </div>
      <div>
        <label className="lbl">Organization <span className="font-normal text-slate-400">(optional)</span></label>
        <input className="field" value={org} onChange={(e) => setOrg(e.target.value)} placeholder="Company or program" />
      </div>
      <div>
        <label className="lbl">How can we help?</label>
        <textarea className="field min-h-[120px]" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell us a bit about your team or program and what you're looking for." required />
      </div>
      {err && <p className="text-sm text-clay">{err}</p>}
      <button className="btn-primary" disabled={busy || !email.includes("@") || !message.trim()}>{busy ? "Sending…" : "Send message"}</button>
    </form>
  );
}
