"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { titleCaseName } from "@/lib/name";
import {
  SEGMENTS,
  GOALS,
  TEAM_SIZES,
  FOUNDER_STAGES,
  type SegmentKey,
} from "@/lib/segments";

export default function ProfileForm({
  me,
  initial,
}: {
  me: string;
  initial: {
    display_name?: string;
    segment?: string;
    goal?: string;
    team_size?: string;
    founder_stage?: string;
    study_field?: string;
    grad_year?: string;
  };
}) {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState(initial.display_name || "");
  const [segment, setSegment] = useState(initial.segment || "");
  const [goal, setGoal] = useState(initial.goal || "");
  const [teamSize, setTeamSize] = useState(initial.team_size || "");
  const [founderStage, setFounderStage] = useState(initial.founder_stage || "");
  const [studyField, setStudyField] = useState(initial.study_field || "");
  const [gradYear, setGradYear] = useState(initial.grad_year || "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const followup = segment ? SEGMENTS.find((s) => s.key === (segment as SegmentKey))?.followup : null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const patch: Record<string, any> = {
      display_name: titleCaseName(name) || null,
      segment: segment || null,
      goal: goal || null,
      team_size: followup === "teamSize" ? teamSize || null : null,
      founder_stage: followup === "founderStage" ? founderStage || null : null,
      study_field: followup === "study" ? studyField || null : null,
      grad_year: followup === "study" ? gradYear || null : null,
    };
    const { error } = await supabase.from("profiles").update(patch).eq("id", me);
    setSaving(false);
    setMsg(error ? error.message : "Saved.");
    if (!error) router.refresh();
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <div>
        <label className="lbl">Your name</label>
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Rivera" />
      </div>

      <div>
        <label className="lbl">Which best describes you?</label>
        <select className="field" value={segment} onChange={(e) => setSegment(e.target.value)}>
          <option value="">—</option>
          {SEGMENTS.map((s) => (
            <option key={s.key} value={s.key}>{s.label.replace(/^I'm |^I /, "")}</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-400">This drives which modules we recommend on your dashboard.</p>
      </div>

      <div>
        <label className="lbl">What you most want to get out of this</label>
        <select className="field" value={goal} onChange={(e) => setGoal(e.target.value)}>
          <option value="">—</option>
          {GOALS.map((g) => (
            <option key={g.key} value={g.key}>{g.label}</option>
          ))}
        </select>
      </div>

      {followup === "teamSize" && (
        <div>
          <label className="lbl">How many people?</label>
          <select className="field" value={teamSize} onChange={(e) => setTeamSize(e.target.value)}>
            <option value="">—</option>
            {TEAM_SIZES.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      )}
      {followup === "founderStage" && (
        <div>
          <label className="lbl">What stage is it at?</label>
          <select className="field" value={founderStage} onChange={(e) => setFounderStage(e.target.value)}>
            <option value="">—</option>
            {FOUNDER_STAGES.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      )}
      {followup === "study" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="lbl">Field of study</label>
            <input className="field" value={studyField} onChange={(e) => setStudyField(e.target.value)} placeholder="e.g. Economics" />
          </div>
          <div>
            <label className="lbl">Graduating (year)</label>
            <input className="field" value={gradYear} onChange={(e) => setGradYear(e.target.value)} placeholder="e.g. 2027" />
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
        {msg && <span className={"text-sm " + (msg === "Saved." ? "text-green-600" : "text-red-600")}>{msg}</span>}
      </div>
    </form>
  );
}
