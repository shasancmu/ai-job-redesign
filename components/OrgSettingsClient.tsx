"use client";

import { useState } from "react";
import OrgBrandingEditor, { type BrandingOrg } from "@/components/OrgBrandingEditor";
import OrgAiSettings from "@/components/OrgAiSettings";
import OrgModulesEditor from "@/components/OrgModulesEditor";

const TABS = [
  { key: "branding", label: "Branding", hint: "Logo, landing page, presence" },
  { key: "modules", label: "Modules", hint: "What your members can use" },
  { key: "ai", label: "AI provider", hint: "Use your own private models" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

// One org at a time (picker when a director runs several), and one area at a time
// (tabs) so the page stays scannable instead of a long stack.
export default function OrgSettingsClient({ orgs }: { orgs: BrandingOrg[] }) {
  const [i, setI] = useState(0);
  const [tab, setTab] = useState<TabKey>("branding");
  const org = orgs[Math.min(i, orgs.length - 1)];
  if (!org) return null;

  return (
    <div className="space-y-5">
      {orgs.length > 1 && (
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Organization</label>
          <div className="flex items-center gap-2">
            {org.logo_url ? <img src={org.logo_url} alt="" className="h-5 max-w-[44px] shrink-0 object-contain" /> : null}
            <select className="field max-w-md" value={i} onChange={(e) => setI(Number(e.target.value))}>
              {orgs.map((o, k) => <option key={o.id} value={k}>{o.name}</option>)}
            </select>
          </div>
          <div className="mt-1.5 text-xs text-slate-400">superadditive.app/{org.slug}</div>
        </div>
      )}

      {/* Section tabs */}
      <div className="flex flex-wrap gap-1 rounded-2xl border border-line bg-mist/40 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={"flex-1 rounded-xl px-4 py-2 text-left transition " + (tab === t.key ? "bg-white shadow-soft" : "hover:bg-white/60")}
          >
            <span className={"block text-sm font-semibold " + (tab === t.key ? "text-ink" : "text-slate2")}>{t.label}</span>
            <span className="mt-0.5 hidden text-[11px] text-slate-400 sm:block">{t.hint}</span>
          </button>
        ))}
      </div>

      {/* Active section — keyed by org so switching orgs resets fields */}
      {tab === "branding" && <OrgBrandingEditor key={`brand-${org.id}`} org={org} />}
      {tab === "modules" && <OrgModulesEditor key={`mods-${org.id}`} orgId={org.id} />}
      {tab === "ai" && <OrgAiSettings key={`ai-${org.id}`} orgId={org.id} />}
    </div>
  );
}
