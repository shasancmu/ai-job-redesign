"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LANGUAGES } from "@/components/LanguagePicker";

// Superadmin/director control: publish an AI-translated copy of a custom module in
// another language. The new module is a normal published row; the original is
// untouched.
export default function LocalizeModule({ slug }: { slug: string }) {
  const router = useRouter();
  const [lang, setLang] = useState("Chinese (Simplified)");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function go() {
    setBusy(true); setErr(null); setMsg(null);
    try {
      const res = await fetch("/api/builder/localize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, language: lang }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Failed");
      setMsg(`Published ${d.slug}`);
      router.refresh();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <select value={lang} onChange={(e) => setLang(e.target.value)} disabled={busy} className="rounded border border-line bg-white px-1.5 py-1 text-[11px] text-ink">
          {LANGUAGES.filter((l) => l !== "English").map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <button onClick={go} disabled={busy} className="rounded bg-ink px-2 py-1 text-[11px] font-semibold text-white transition hover:opacity-90 disabled:opacity-40">{busy ? "Translating…" : "Copy"}</button>
      </div>
      {msg && <span className="text-[11px] text-sage">{msg}</span>}
      {err && <span className="text-[11px] text-clay">{err}</span>}
    </div>
  );
}
