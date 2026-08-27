"use client";

import { useState } from "react";
import Logo from "@/components/Logo";
import { type Msg } from "@/components/RoleplayChat";
import CensusVoiceInterview from "@/components/CensusVoiceInterview";
import CensusReport from "@/components/CensusReport";
import { WMS, EMPLOYEE_BANDS, REVENUE_BANDS, CUSTOMER_TYPES, OWNERSHIP_TYPES, TIE_TYPES, shotsFor, type NetworkEdge } from "@/lib/census";

async function jpost(path: string, body: any) {
  const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { ok: res.ok, data: await res.json().catch(() => ({})) };
}

async function fileToDataUrl(file: File, max = 1100, q = 0.72): Promise<string> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  c.getContext("2d")!.drawImage(img, 0, 0, w, h);
  return c.toDataURL("image/jpeg", q);
}

const STEPS = ["Consent", "Your business", "The basics", "Show us", "How you run it", "Who you work with", "Your profile"];

export default function BusinessProfileFlow({ code, firmCode }: { code: string; firmCode?: string }) {
  const [step, setStep] = useState(0);
  const [rec, setRec] = useState<any>({ network: [], photos: [], mgmtChat: [] as Msg[], wmsAnswers: {} });
  const set = (patch: any) => setRec((r: any) => ({ ...r, ...patch }));

  const [report, setReport] = useState<any>(null);
  const [result, setResult] = useState<{ firmCode?: string; wave?: number }>({});
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    setSubmitting(true); setErr("");
    const transcript = (rec.mgmtChat || []).map((m: Msg) => `${m.role === "user" ? "Owner" : "Interviewer"}: ${m.content}`).join("\n");
    const record = { ...rec, transcript, mode: rec.mode || (transcript ? "voice" : "text") };
    delete record.mgmtChat;
    const { ok, data } = await jpost("/api/census/submit", { campaign: code, firmCode: firmCode || "", record });
    setSubmitting(false);
    if (!ok || !data.report) { setErr(data.error || "Couldn't build your profile. Try again."); return; }
    setReport(data.report); setResult({ firmCode: data.firmCode, wave: data.wave });
  }

  if (report) {
    const updateUrl = result.firmCode ? `${typeof window !== "undefined" ? window.location.origin : ""}/census/${code}?firm=${result.firmCode}` : "";
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between"><Logo /><span className="text-sm text-sage">Saved{result.wave && result.wave > 1 ? ` · update ${result.wave}` : ""}. Thank you.</span></div>
        <div className="mb-4"><div className="text-sm font-semibold uppercase tracking-wide text-slate-400">Your business profile</div><h1 className="mt-1 text-3xl text-ink">{rec.name || "Your business"}</h1></div>
        <CensusReport report={report} />
        {updateUrl && (
          <div className="mt-5 rounded-xl border border-line bg-mist p-4 text-sm">
            <div className="font-semibold text-ink">Come back to update your profile</div>
            <p className="mt-1 text-slate-600">Use this link next time so your progress is tracked, not overwritten.</p>
            <div className="mt-2 break-all font-mono text-xs text-slate-500">{updateUrl}</div>
          </div>
        )}
      </main>
    );
  }

  const canNext =
    step === 0 ? !!rec.consent :
    step === 1 ? !!(rec.name && rec.industry_desc) :
    true;

  return (
    <main className="mx-auto max-w-lg px-4 py-6 sm:px-6">
      <div className="mb-5 flex items-center justify-between"><Logo /><span className="text-xs text-slate-400">~10 minutes</span></div>
      <div className="mb-5 flex items-center gap-1">
        {STEPS.map((_, i) => <div key={i} className={"h-1.5 flex-1 rounded-full " + (i < step ? "bg-ink" : i === step ? "bg-ai" : "bg-slate-200")} />)}
      </div>
      <div className="mb-4"><div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Step {step + 1} of {STEPS.length}</div><h1 className="mt-0.5 text-2xl font-bold text-ink">{STEPS[step]}</h1></div>

      <div className="pb-28">
        {step === 0 && <Consent rec={rec} set={set} />}
        {step === 1 && <Identify rec={rec} set={set} />}
        {step === 2 && <Basics rec={rec} set={set} />}
        {step === 3 && <Photos rec={rec} set={set} />}
        {step === 4 && <Manage rec={rec} set={set} code={code} />}
        {step === 5 && <Network rec={rec} set={set} />}
        {step === 6 && <Finish rec={rec} set={set} submit={submit} submitting={submitting} err={err} />}
      </div>

      {step < 6 && (
        <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="btn-ghost">Back</button>
            <button onClick={() => setStep((s) => s + 1)} disabled={!canNext} className="btn-primary disabled:opacity-50">Next →</button>
          </div>
        </div>
      )}
    </main>
  );
}

function Consent({ rec, set }: any) {
  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-slate-600">This short profile adds your business to the directory: what it does, its size and location, how it is run, and who it works with. You will get an instant read on your business at the end.</p>
      <ul className="space-y-1.5 text-sm text-slate-600">
        <li>• It takes about 10 minutes.</li>
        <li>• Your details and photos are added to the business directory.</li>
        <li>• Photos are kept with your profile and read into a short description.</li>
      </ul>
      <label className="flex items-start gap-2 rounded-xl border border-line p-3 text-sm text-slate-700">
        <input type="checkbox" checked={!!rec.consent} onChange={(e) => set({ consent: e.target.checked })} className="mt-0.5 h-4 w-4 accent-[color:var(--ink)]" />
        <span>I agree to add my business to the directory.</span>
      </label>
    </div>
  );
}

function Identify({ rec, set }: any) {
  const [locating, setLocating] = useState(false);
  const [gpsErr, setGpsErr] = useState("");
  const [classifying, setClassifying] = useState(false);

  function useGps() {
    if (typeof navigator === "undefined" || !navigator.geolocation) { setGpsErr("Location is not available on this device."); return; }
    setGpsErr(""); setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        set({ lat: latitude, lng: longitude, gps_accuracy: Math.round(accuracy), geo_source: "gps" });
        try {
          const { data } = await jpost("/api/census/geocode", { lat: latitude, lng: longitude });
          if (data) set({ admin1: data.admin1, locality: data.locality, country: data.country || rec.country, geo_source: "gps" });
        } catch {}
        setLocating(false);
      },
      (e) => { setLocating(false); setGpsErr(e.code === 1 ? "Location permission was denied. You can type an address instead." : "Couldn't get your location. Type an address instead."); },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }

  async function locate() {
    if (!rec.address) return;
    setLocating(true); setGpsErr("");
    const { data } = await jpost("/api/census/geocode", { address: rec.address, country: rec.country || "" });
    setLocating(false);
    if (data && (data.lat || data.lat === 0)) set({ lat: data.lat, lng: data.lng, admin1: data.admin1, locality: data.locality, country: data.country || rec.country, geo_source: data.source });
  }
  async function classify() {
    if (!rec.industry_desc) return;
    setClassifying(true);
    const { data } = await jpost("/api/census/classify", { desc: rec.industry_desc, country: rec.country || "" });
    setClassifying(false);
    if (data && data.naics) set({ naics: data.naics, naics_label: data.naics_label, isic: data.isic, isic_label: data.isic_label, classify_conf: data.confidence });
  }

  return (
    <div className="space-y-4">
      <div><label className="lbl">Business name</label><input className="field" value={rec.name || ""} onChange={(e) => set({ name: e.target.value })} placeholder="Acme Bakery" /></div>
      <div>
        <label className="lbl">Location</label>
        <button onClick={useGps} disabled={locating} className="btn-primary w-full disabled:opacity-60">{locating ? "Getting location..." : "📍 Use my current location (GPS)"}</button>
        <p className="mt-1 text-xs text-slate-400">Best done standing at the business. Most accurate.</p>
        {rec.lat != null && (
          <p className="mt-1 text-xs text-sage">✓ {rec.geo_source === "gps" ? "GPS pinned" : "Located"}{rec.locality ? `: ${rec.locality}` : ""}{rec.admin1 ? `, ${rec.admin1}` : ""}{rec.country ? `, ${rec.country}` : ""}{rec.geo_source === "gps" && rec.gps_accuracy ? ` (±${rec.gps_accuracy}m)` : ""}</p>
        )}
        {gpsErr && <p className="mt-1 text-xs text-clay">{gpsErr}</p>}
      </div>
      <div>
        <label className="lbl">Or type the address {rec.geo_source === "gps" ? "(optional)" : ""}</label>
        <input className="field" value={rec.country || ""} onChange={(e) => set({ country: e.target.value })} placeholder="Country, e.g. Kenya, India, Brazil" />
        <div className="mt-2 flex items-center gap-2">
          <input className="field" value={rec.address || ""} onChange={(e) => set({ address: e.target.value })} placeholder="Street, city / town" />
          <button onClick={locate} disabled={locating || !rec.address} className="btn-ghost shrink-0 text-sm">{locating ? "..." : "Locate"}</button>
        </div>
      </div>
      <div>
        <label className="lbl">What does the business do?</label>
        <textarea className="field" rows={2} value={rec.industry_desc || ""} onChange={(e) => set({ industry_desc: e.target.value, naics: "" })} onBlur={classify} placeholder="e.g. A neighborhood bakery selling bread, pastries, and coffee." />
        {classifying && <p className="mt-1 text-xs text-slate-400">Classifying...</p>}
        {rec.naics && (
          <div className="mt-2 rounded-xl bg-mist p-3 text-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Industry</div>
            <div className="mt-1 text-ink"><b>{rec.isic_label || rec.naics_label}</b> <span className="text-xs text-slate-400">{rec.isic ? `ISIC ${rec.isic}` : ""}{rec.naics ? ` · NAICS ${rec.naics}` : ""}{typeof rec.classify_conf === "number" ? ` · ${Math.round(rec.classify_conf * 100)}% conf` : ""}</span></div>
          </div>
        )}
      </div>
    </div>
  );
}

function Basics({ rec, set }: any) {
  return (
    <div className="space-y-4">
      <div><label className="lbl">How many people work there?</label>
        <div className="flex flex-wrap gap-1.5">{EMPLOYEE_BANDS.map((b) => <Chip key={b} on={rec.employees_band === b} onClick={() => set({ employees_band: b })}>{b}</Chip>)}</div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="lbl">Founded (year)</label><input type="number" className="field" value={rec.founded_year || ""} onChange={(e) => set({ founded_year: Number(e.target.value) || null })} placeholder="2015" /></div>
        <div><label className="lbl">More than one location?</label>
          <div className="flex gap-1.5"><Chip on={rec.multi_site === false} onClick={() => set({ multi_site: false })}>One</Chip><Chip on={rec.multi_site === true} onClick={() => set({ multi_site: true })}>Multiple</Chip></div>
        </div>
      </div>
      <div><label className="lbl">Who are your customers?</label>
        <div className="flex flex-wrap gap-1.5">{CUSTOMER_TYPES.map((c) => <Chip key={c.key} on={rec.customer_type === c.key} onClick={() => set({ customer_type: c.key })}>{c.label}</Chip>)}</div>
      </div>
      <div><label className="lbl">Ownership</label>
        <div className="flex flex-wrap gap-1.5">{OWNERSHIP_TYPES.map((o) => <Chip key={o.key} on={rec.ownership === o.key} onClick={() => set({ ownership: o.key })}>{o.label}</Chip>)}</div>
      </div>
      <div><label className="lbl">Annual revenue (optional)</label>
        <div className="flex flex-wrap gap-1.5">{REVENUE_BANDS.map((b) => <Chip key={b} on={rec.revenue_band === b} onClick={() => set({ revenue_band: b })}>{b}</Chip>)}</div>
      </div>
    </div>
  );
}

function Photos({ rec, set }: any) {
  const shots = shotsFor(rec);
  const [busy, setBusy] = useState<string>("");
  const got = (key: string) => (rec.photos || []).find((p: any) => p.shot === key);

  async function capture(shot: any, files: FileList | null) {
    if (!files || !files.length) return;
    setBusy(shot.key);
    try {
      const url = await fileToDataUrl(files[0]);
      const { data } = await jpost("/api/census/photo", { image: url, shot: `${shot.instruction} ${shot.hint}`, business: rec.industry_desc || "" });
      if (data && (data.description || data.title || data.path)) {
        const photos = [...(rec.photos || []).filter((p: any) => p.shot !== shot.key), { shot: shot.key, title: data.title || "", description: data.description || "", path: data.path || "" }];
        set({ photos });
      }
    } catch {}
    setBusy("");
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">Take these {shots.length} photos so we can build a standard picture of your business. Take the same shots each time you update, so your progress shows. Optional, but it makes the read much better.</p>
      {shots.map((shot) => {
        const p = got(shot.key);
        return (
          <div key={shot.key} className={"card p-4 " + (p ? "border-sage/40" : "")}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-bold text-ink">{p ? "✓ " : ""}{shot.label}</div>
                <div className="text-xs text-slate-500">{shot.instruction}</div>
              </div>
              <label className="btn-ghost shrink-0 cursor-pointer text-sm">
                {busy === shot.key ? "Reading..." : p ? "Retake" : "Take photo"}
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => capture(shot, e.target.files)} />
              </label>
            </div>
            {p && <div className="mt-2 rounded-lg bg-mist p-2 text-xs leading-snug text-slate-500 line-clamp-2">{p.description}</div>}
          </div>
        );
      })}
    </div>
  );
}

function LangToggle({ rec, set }: any) {
  const lang = rec.lang || "en";
  const opts = [{ k: "en", label: "English" }, { k: "ur", label: "اردو" }, { k: "lud", label: "لسان الدعوة" }];
  return (
    <div className="flex items-center gap-1 rounded-full bg-mist p-0.5">
      {opts.map((o) => (
        <button key={o.k} onClick={() => set({ lang: o.k, mgmtChat: [] })} className={"rounded-full px-3 py-1 text-sm font-semibold transition " + (lang === o.k ? "bg-ink text-white" : "text-slate-500 hover:text-ink")}>{o.label}</button>
      ))}
    </div>
  );
}

function Manage({ rec, set, code }: any) {
  const mode = rec.mode || "";
  const lang = rec.lang || "en";
  if (!mode) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-slate-600">How you actually run the business.</p>
          <LangToggle rec={rec} set={set} />
        </div>
        <button onClick={() => set({ mode: "voice" })} className="card w-full p-5 text-left transition hover:shadow-lift">
          <div className="font-bold text-ink">🎙 Talk it through <span className="text-xs font-normal text-slate-400">faster</span></div>
          <div className="mt-1 text-sm text-slate-500">A short spoken conversation. The interviewer talks; you answer out loud{lang === "en" ? "" : " (speech is supported in English, Urdu, and Gujarati where the browser allows)"}.</div>
        </button>
        <button onClick={() => set({ mode: "text", mgmtChat: [] })} className="card w-full p-5 text-left transition hover:shadow-lift">
          <div className="font-bold text-ink">⌨ Quick multiple choice</div>
          <div className="mt-1 text-sm text-slate-500">Eight quick questions{lang === "en" ? "" : " (shown in English)"}.</div>
        </button>
      </div>
    );
  }
  if (mode === "voice") {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <button className="text-xs text-slate-400 underline" onClick={() => set({ mode: "" })}>← Back</button>
          <LangToggle rec={rec} set={set} />
        </div>
        <CensusVoiceInterview chat={rec.mgmtChat || []} setChat={(c) => set({ mgmtChat: c })} lang={lang} />
      </div>
    );
  }
  // text: the 8-item WMS
  const answers = rec.wmsAnswers || {};
  return (
    <div className="space-y-3">
      {WMS.map((q) => (
        <div key={q.id} className="card p-4">
          <div className="text-sm font-semibold text-ink">{q.prompt}</div>
          <div className="mt-2 space-y-1.5">
            {q.options.map((o) => (
              <button key={o.score} onClick={() => set({ wmsAnswers: { ...answers, [q.id]: o.score } })} className={"block w-full rounded-lg border p-2 text-left text-sm " + (answers[q.id] === o.score ? "border-ink bg-ink/5" : "border-line hover:border-slate-300")}>{o.label}</button>
            ))}
          </div>
        </div>
      ))}
      <p className="text-xs text-slate-400"><button className="underline" onClick={() => set({ mode: "" })}>Switch to talking instead</button></p>
    </div>
  );
}

function Network({ rec, set }: any) {
  const edges: NetworkEdge[] = rec.network || [];
  function setEdge(i: number, patch: Partial<NetworkEdge>) { const n = [...edges]; n[i] = { ...n[i], ...patch }; set({ network: n }); }
  function add() { set({ network: [...edges, { name: "", tie: "supplier", strength: 3 }] }); }
  function remove(i: number) { set({ network: edges.filter((_, j) => j !== i) }); }
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">Name a few businesses or people you work with most: a key supplier, your biggest customer, a competitor, an advisor. Optional.</p>
      {edges.map((e, i) => (
        <div key={i} className="card p-3">
          <div className="flex items-center gap-2">
            <input className="field flex-1" value={e.name} onChange={(ev) => setEdge(i, { name: ev.target.value })} placeholder="Name" />
            <button onClick={() => remove(i)} className="shrink-0 text-slate-400 hover:text-clay">✕</button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">{TIE_TYPES.map((t) => <Chip key={t.key} on={e.tie === t.key} onClick={() => setEdge(i, { tie: t.key })}>{t.label}</Chip>)}</div>
        </div>
      ))}
      {edges.length < 5 && <button onClick={add} className="btn-ghost text-sm">+ Add a relationship</button>}
    </div>
  );
}

function Finish({ rec, set, submit, submitting, err }: any) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">That is everything. Generate your instant business profile: a read on how you are managed, where your margin really lives, and how you compare.</p>
      <div className="rounded-xl bg-mist p-4 text-sm text-slate-600">
        <div><b className="text-ink">{rec.name || "Your business"}</b>{rec.naics_label ? ` · ${rec.naics_label}` : ""}</div>
        <div className="mt-1 text-xs text-slate-400">{rec.employees_band ? `${rec.employees_band} people` : ""}{rec.locality ? ` · ${rec.locality}` : ""}{(rec.photos || []).length ? ` · ${rec.photos.length} photo(s)` : ""}</div>
      </div>
      <div>
        <label className="lbl">Email me a copy (optional)</label>
        <input className="field" value={rec.contact_email || ""} onChange={(e) => set({ contact_email: e.target.value })} placeholder="you@business.com" />
      </div>
      <button onClick={submit} disabled={submitting} className="btn-primary w-full">{submitting ? "Building your profile..." : "See my profile →"}</button>
      {err && <p className="text-sm text-red-700">{err}</p>}
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={"rounded-full border px-3 py-1 text-sm transition " + (on ? "border-ink bg-ink text-white" : "border-line bg-white text-slate-600 hover:border-slate-300")}>{children}</button>;
}
