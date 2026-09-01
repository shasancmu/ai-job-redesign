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
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Which organization?</div>
          <div className="flex flex-wrap gap-2">
            {orgs.map((o, k) => (
              <button
                key={o.id}
                onClick={() => setI(k)}
                className={"flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition " + (k === i ? "border-ink bg-ink text-white" : "border-line bg-white text-slate2 hover:bg-mist")}
              >
                {o.logo_url ? <img src={o.logo_url} alt="" className="h-4 max-w-[40px] object-contain" /> : null}
                {o.name}
              </button>
            ))}
          </div>
          <div className="mt-2 text-xs text-slate-400">Editing <span className="font-medium text-slate2">{org.name}</span> · superadditive.app/{org.slug}</div>
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
