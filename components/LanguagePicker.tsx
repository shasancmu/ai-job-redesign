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

  async function change(v: string) {
    setLang(v);
    setSaving(true);
    try {
      await createClient().from("profiles").update({ language: v }).eq("id", me);
      router.refresh(); // re-render the UI in the new locale
    } finally {
      setSaving(false);
    }
  }

  return (
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
  );
}
