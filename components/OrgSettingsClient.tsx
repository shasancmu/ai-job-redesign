"use client";

import { useState } from "react";
import OrgBrandingEditor, { type BrandingOrg } from "@/components/OrgBrandingEditor";
import OrgAiSettings from "@/components/OrgAiSettings";

// When a director runs more than one org, stacking every editor is confusing —
// show a picker and edit one at a time.
export default function OrgSettingsClient({ orgs }: { orgs: BrandingOrg[] }) {
  const [i, setI] = useState(0);
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
      {/* key forces a fresh editor (resetting its fields) when you switch orgs */}
      <OrgBrandingEditor key={org.id} org={org} />
      <OrgAiSettings key={`ai-${org.id}`} orgId={org.id} />
    </div>
  );
}
