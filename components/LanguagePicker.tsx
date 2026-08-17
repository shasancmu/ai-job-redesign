"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/components/I18nProvider";

// The exercises' AI content (interviews, analyses, debriefs) runs in this
// language. Stored on the profile; every AI route reads it.
export const LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "German",
  "Portuguese",
  "Portuguese (Brazil)",
  "Italian",
  "Dutch",
  "Chinese (Simplified)",
  "Japanese",
  "Korean",
  "Arabic",
  "Hindi",
];

export default function LanguagePicker({ me, initial }: { me: string; initial?: string }) {
  const t = useT();
  const router = useRouter();
  const [lang, setLang] = useState(initial || "English");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function change(v: string) {
    setLang(v);
    setSaving(true);
    setErr(null);
    try {
      const { error } = await createClient().from("profiles").update({ language: v }).eq("id", me);
      if (error) {
        // Most likely the profiles.language column is missing — surface it
        // instead of silently doing nothing.
        setErr(error.message.includes("language") ? "Language isn't set up yet (missing column)." : error.message);
        return;
      }
      router.refresh(); // re-render the UI in the new locale
    } catch (e: any) {
      setErr(e?.message || "Couldn't save language.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <label className="flex items-center gap-1.5 text-sm text-slate-500" title={t("lang.label")}>
        <span aria-hidden>🌐</span>
        <select
          value={lang}
          onChange={(e) => change(e.target.value)}
          disabled={saving}
          className="rounded-lg border border-line bg-white px-2 py-1 text-sm text-ink outline-none hover:border-slate-300"
        >
          {LANGUAGES.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </label>
      {err && <span className="text-xs text-red-600">{err}</span>}
    </div>
  );
}
