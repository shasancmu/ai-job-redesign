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
// (Duke, Cornell, MIT…), tick the ones you want — they stick as removable chips
// so your choices stay visible while you search for more — or pick a country, or
// go global. The three tabs are mutually exclusive: exactly one is in effect,
// and the summary line at the bottom always spells out what will actually be
// queried, so there is never ambiguity between an institution and a country.
export default function ScientifiqScopePicker({ initial, onChange }: { initial?: Partial<Scope>; onChange: (s: Scope) => void }) {
  const [kind, setKind] = useState<Scope["kind"]>(initial?.kind || "org");
  const [orgQuery, setOrgQuery] = useState(initial?.orgQuery || "");
  const [orgOptions, setOrgOptions] = useState<Opt[]>([]);
  // Selected institutions are kept WITH their names (not just ids) so a chip can
  // still render after you have searched for something else and the option
  // scrolled out of the results list.
  const [selectedOrgs, setSelectedOrgs] = useState<Opt[]>(
    (initial?.orgIds || []).map((id, i) => ({ id, name: i === 0 && initial?.scopeLabel ? initial.scopeLabel.replace(/ \+\d+ more$/, "") : id }))
  );
  const [countryQuery, setCountryQuery] = useState("");
  const [countryOptions, setCountryOptions] = useState<Opt[]>([]);
  const [country, setCountry] = useState<Opt | null>(initial?.countryId ? { id: initial.countryId, name: initial.scopeLabel || "" } : null);
  const [loading, setLoading] = useState(false);
  const touched = useRef((initial?.orgIds || []).length > 0); // has the user chosen institutions themselves?

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

  // Debounced institution lookup. Only auto-selects the top hit as a convenience
  // when NOTHING is chosen yet and the user hasn't started picking manually —
  // once you have chips, a new search never disturbs them.
  useEffect(() => {
    if (kind !== "org") return;
    const id = setTimeout(async () => {
      const opts = await lookup("org", orgQuery);
      setOrgOptions(opts);
      if (!touched.current && selectedOrgs.length === 0) {
        const best = bestMatch(opts, orgQuery);
        if (best) setSelectedOrgs([best]);
      }
    }, 400);
    return () => clearTimeout(id);
  }, [orgQuery, kind, lookup]); // eslint-disable-line

  // Debounced country lookup.
  useEffect(() => {
    if (kind !== "country") return;
    const id = setTimeout(async () => setCountryOptions(await lookup("country", countryQuery)), 400);
    return () => clearTimeout(id);
  }, [countryQuery, kind, lookup]);

  // Emit the resolved scope upward. Only the ACTIVE tab contributes — switching
  // tabs is what changes the scope, never a stale selection on another tab.
  useEffect(() => {
    if (kind === "global") { onChange({ kind, orgIds: [], countryId: "", scopeLabel: "Global (all institutions)", orgQuery }); return; }
    if (kind === "country") { onChange({ kind, orgIds: [], countryId: country?.id || "", scopeLabel: country?.name || "", orgQuery }); return; }
    const label = selectedOrgs.length ? selectedOrgs[0].name + (selectedOrgs.length > 1 ? ` +${selectedOrgs.length - 1} more` : "") : orgQuery;
    onChange({ kind, orgIds: selectedOrgs.map((o) => o.id), countryId: "", scopeLabel: label, orgQuery });
  }, [kind, selectedOrgs, country, orgQuery]); // eslint-disable-line

  // A restored scope gives us ids but only the primary's name; treat any chip
  // whose name still equals its id as "unresolved" and roll those into one
  // "+N more" pill rather than showing raw ids.
  const namedChips = selectedOrgs.filter((o) => o.name && o.name !== o.id);
  const unresolvedCount = selectedOrgs.length - namedChips.length;

  const isSelected = (id: string) => selectedOrgs.some((o) => o.id === id);
  const toggleOrg = (o: Opt) => {
    touched.current = true;
    setSelectedOrgs((s) => (s.some((x) => x.id === o.id) ? s.filter((x) => x.id !== o.id) : [...s, o]));
  };
  const removeOrg = (id: string) => { touched.current = true; setSelectedOrgs((s) => s.filter((o) => o.id !== id)); };

  const KINDS: { key: Scope["kind"]; label: string }[] = [
    { key: "org", label: "Institution" },
    { key: "country", label: "Country" },
    { key: "global", label: "Global" },
  ];

  // One plain-English line that always states exactly what will be queried.
  const summary =
    kind === "global"
      ? "Every institution worldwide."
      : kind === "country"
      ? country ? `Every institution in ${country.name}.` : "Pick a country above."
      : selectedOrgs.length
      ? [namedChips.map((o) => o.name).join(", "), unresolvedCount > 0 ? `+${unresolvedCount} more` : ""].filter(Boolean).join(", ")
      : "Search and tick at least one institution.";

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {KINDS.map((k) => (
          <button key={k.key} onClick={() => setKind(k.key)} className={"rounded-full px-3 py-1.5 text-sm font-medium transition " + (kind === k.key ? "bg-ink text-white" : "bg-mist text-slate2 hover:bg-slate-200")}>{k.label}</button>
        ))}
      </div>

      {kind === "org" && (
        <div className="mt-3">
          {/* Persistent chips of what you've chosen — visible no matter what you
              search for next, each removable. */}
          {selectedOrgs.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {namedChips.map((o) => (
                <span key={o.id} className="inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-sm font-medium text-white">
                  {o.name}
                  <button onClick={() => removeOrg(o.id)} aria-label={`Remove ${o.name}`} className="-mr-0.5 ml-0.5 rounded-full px-1 text-white/70 hover:text-white">×</button>
                </span>
              ))}
              {unresolvedCount > 0 && (
                <span className="inline-flex items-center rounded-full bg-slate-200 px-2.5 py-1 text-sm font-medium text-slate2">+{unresolvedCount} more</span>
              )}
            </div>
          )}
          <input className="field" value={orgQuery} onChange={(e) => setOrgQuery(e.target.value)} placeholder={selectedOrgs.length ? "Add another institution…" : "Any university, e.g. Cornell University, MIT, Stanford"} />
          {orgOptions.length > 0 ? (
            <div className="mt-2 rounded-xl border border-line bg-white p-2">
              <div className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{loading ? "Searching…" : "Tick to include"}</div>
              <div className="max-h-52 space-y-0.5 overflow-y-auto">
                {orgOptions.map((o) => (
                  <label key={o.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-mist">
                    <input type="checkbox" checked={isSelected(o.id)} onChange={() => toggleOrg(o)} className="h-4 w-4 shrink-0 accent-[color:var(--ink)]" />
                    <span className="text-ink">{o.name}</span>
                    {isSelected(o.id) && <span className="ml-auto text-[11px] font-semibold uppercase tracking-wide text-emerald-600">Added</span>}
                  </label>
                ))}
              </div>
              <p className="mt-1 px-1 text-[11px] leading-snug text-slate-400">Add the main institution plus any affiliated units (medical center, health system) — or several different institutions.</p>
            </div>
          ) : (
            <p className="mt-1.5 text-xs text-slate-400">{loading ? "Searching…" : orgQuery.trim().length >= 2 ? "No matching institution found. Try the full official name." : selectedOrgs.length ? "Type to add another, or scan with the ones above." : "Type an institution name."}</p>
          )}
        </div>
      )}

      {kind === "country" && (
        <div className="mt-3">
          <input className="field" value={country ? country.name : countryQuery} onChange={(e) => { setCountry(null); setCountryQuery(e.target.value); }} placeholder="Any country, e.g. United States, India, Kazakhstan" />
          {!country && countryOptions.length > 0 && (
            <div className="mt-2 max-h-52 space-y-0.5 overflow-y-auto rounded-xl border border-line bg-white p-2">
              {countryOptions.map((c) => (
                <button key={c.id} onClick={() => { setCountry(c); setCountryOptions([]); }} className="block w-full rounded-lg px-2 py-1.5 text-left text-sm text-ink hover:bg-mist">{c.name}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Always-visible statement of the effective scope — removes any doubt
          about which tab is in force (a country never silently overrides a
          chosen institution; the active tab is the scope). */}
      <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-mist px-3 py-2 text-sm">
        <span className="font-semibold text-slate2">Scanning:</span>
        <span className="text-ink">{summary}</span>
      </div>
    </div>
  );
}
