"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Scope = {
  kind: "org" | "country" | "global";
  orgIds: string[];
  countryId: string;
  scopeLabel: string;
  orgQuery: string;
};

type Opt = { id: string; name: string };

// A general scope picker for any Scientifiq report: search ANY institution
// (Duke, Cornell, MIT…), see exactly which organizations matched, and include
// affiliated ones (Duke University + Duke Medical Center + …); or pick a country;
// or go global. Transparent about what is actually being queried.
export default function ScientifiqScopePicker({ initial, onChange }: { initial?: Partial<Scope>; onChange: (s: Scope) => void }) {
  const [kind, setKind] = useState<Scope["kind"]>(initial?.kind || "org");
  const [orgQuery, setOrgQuery] = useState(initial?.orgQuery || "");
  const [orgOptions, setOrgOptions] = useState<Opt[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set(initial?.orgIds || []));
  const [countryQuery, setCountryQuery] = useState("");
  const [countryOptions, setCountryOptions] = useState<Opt[]>([]);
  const [country, setCountry] = useState<Opt | null>(initial?.countryId ? { id: initial.countryId, name: initial.scopeLabel || "" } : null);
  const [loading, setLoading] = useState(false);
  const touched = useRef(false); // has the user manually toggled org checkboxes?

  const lookup = useCallback(async (type: "org" | "country", q: string): Promise<Opt[]> => {
    if (q.trim().length < 2) return [];
    setLoading(true);
    try {
      const res = await fetch(`/api/scientifiq/lookup?type=${type}&q=${encodeURIComponent(q)}`);
      const j = await res.json();
      return (j.results || []) as Opt[];
    } catch { return []; } finally { setLoading(false); }
  }, []);

  // Pick the best "primary" match for an institution query.
  const bestMatch = (opts: Opt[], q: string): Opt | undefined => {
    const s = q.trim().toLowerCase();
    return opts.find((o) => o.name.toLowerCase() === s) || opts.find((o) => o.name.toLowerCase().startsWith(s)) || [...opts].sort((a, b) => a.name.length - b.name.length)[0];
  };

  // Debounced institution lookup.
  useEffect(() => {
    if (kind !== "org") return;
    const id = setTimeout(async () => {
      const opts = await lookup("org", orgQuery);
      setOrgOptions(opts);
      if (!touched.current) {
        const best = bestMatch(opts, orgQuery);
        setSelected(new Set(best ? [best.id] : []));
      }
    }, 400);
    return () => clearTimeout(id);
  }, [orgQuery, kind, lookup]);

  // Debounced country lookup.
  useEffect(() => {
    if (kind !== "country") return;
    const id = setTimeout(async () => setCountryOptions(await lookup("country", countryQuery)), 400);
    return () => clearTimeout(id);
  }, [countryQuery, kind, lookup]);

  // Emit the resolved scope upward.
  useEffect(() => {
    if (kind === "global") { onChange({ kind, orgIds: [], countryId: "", scopeLabel: "Global (all institutions)", orgQuery }); return; }
    if (kind === "country") { onChange({ kind, orgIds: [], countryId: country?.id || "", scopeLabel: country?.name || "", orgQuery }); return; }
    const chosen = orgOptions.filter((o) => selected.has(o.id));
    const primary = bestMatch(chosen, orgQuery) || chosen[0];
    const label = primary ? primary.name + (chosen.length > 1 ? ` +${chosen.length - 1} affiliated` : "") : orgQuery;
    onChange({ kind, orgIds: [...selected], countryId: "", scopeLabel: label, orgQuery });
  }, [kind, selected, orgOptions, country, orgQuery]); // eslint-disable-line

  const toggleOrg = (id: string) => { touched.current = true; setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); };

  const KINDS: { key: Scope["kind"]; label: string }[] = [
    { key: "org", label: "Institution" },
    { key: "country", label: "Country" },
    { key: "global", label: "Global" },
  ];

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {KINDS.map((k) => (
          <button key={k.key} onClick={() => setKind(k.key)} className={"rounded-full px-3 py-1.5 text-sm font-medium transition " + (kind === k.key ? "bg-ink text-white" : "bg-mist text-slate2 hover:bg-slate-200")}>{k.label}</button>
        ))}
      </div>

      {kind === "org" && (
        <div className="mt-3">
          <input className="field" value={orgQuery} onChange={(e) => { touched.current = false; setOrgQuery(e.target.value); }} placeholder="Any university, e.g. Cornell University, MIT, Stanford" />
          {orgOptions.length > 0 ? (
            <div className="mt-2 rounded-xl border border-line bg-white p-2">
              <div className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{loading ? "Searching…" : "Include these organizations"}</div>
              <div className="max-h-52 space-y-0.5 overflow-y-auto">
                {orgOptions.map((o) => (
                  <label key={o.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-mist">
                    <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggleOrg(o.id)} className="h-4 w-4 shrink-0 accent-[color:var(--ink)]" />
                    <span className="text-ink">{o.name}</span>
                  </label>
                ))}
              </div>
              <p className="mt-1 px-1 text-[11px] leading-snug text-slate-400">Tick the main institution plus any affiliated units (medical center, health system, institutes) you want counted.</p>
            </div>
          ) : (
            <p className="mt-1.5 text-xs text-slate-400">{loading ? "Searching…" : orgQuery.trim().length >= 2 ? "No matching institution found. Try the full official name." : "Type an institution name."}</p>
          )}
        </div>
      )}

      {kind === "country" && (
        <div className="mt-3">
          <input className="field" value={country ? country.name : countryQuery} onChange={(e) => { setCountry(null); setCountryQuery(e.target.value); }} placeholder="Any country, e.g. United States, United Kingdom" />
          {!country && countryOptions.length > 0 && (
            <div className="mt-2 max-h-52 space-y-0.5 overflow-y-auto rounded-xl border border-line bg-white p-2">
              {countryOptions.map((c) => (
                <button key={c.id} onClick={() => { setCountry(c); setCountryOptions([]); }} className="block w-full rounded-lg px-2 py-1.5 text-left text-sm text-ink hover:bg-mist">{c.name}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {kind === "global" && <p className="mt-2 text-xs text-slate-400">Every institution worldwide, no scope filter.</p>}
    </div>
  );
}
