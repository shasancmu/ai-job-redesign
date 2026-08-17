// ============================================================================
// Lightweight i18n for UI chrome. Messages live in messages/{locale}.json;
// missing keys fall back to English. The AI *content* is localized separately
// (lib/lang.ts + lib/ai.ts). Locale is derived from the user's profile.language.
// ============================================================================
import en from "@/messages/en.json";
import es from "@/messages/es.json";
import ar from "@/messages/ar.json";
import ptBR from "@/messages/pt-BR.json";
import zh from "@/messages/zh.json";
import hi from "@/messages/hi.json";
import fr from "@/messages/fr.json";
import de from "@/messages/de.json";
import it from "@/messages/it.json";

const DICTS: Record<string, any> = { en, es, ar, "pt-BR": ptBR, zh, hi, fr, de, it };

// Language display names (as stored on profiles.language) → locale codes.
const LANG_TO_LOCALE: Record<string, string> = {
  english: "en",
  spanish: "es",
  arabic: "ar",
  french: "fr",
  german: "de",
  portuguese: "pt",
  "portuguese (brazil)": "pt-BR",
  italian: "it",
  dutch: "nl",
  "chinese (simplified)": "zh",
  japanese: "ja",
  korean: "ko",
  hindi: "hi",
};

export function localeFromLanguage(language?: string | null): string {
  const code = LANG_TO_LOCALE[(language || "").trim().toLowerCase()] || "en";
  return DICTS[code] ? code : "en"; // only use locales we actually ship
}

const RTL = new Set(["ar", "he", "fa", "ur"]);
export function isRTL(locale: string): boolean {
  return RTL.has(locale);
}

function lookup(dict: any, key: string): string | undefined {
  return key.split(".").reduce((o: any, k) => (o == null ? undefined : o[k]), dict);
}

export type T = (key: string, vars?: Record<string, string | number>) => string;

export function makeT(locale: string): T {
  const dict = DICTS[locale] || DICTS.en;
  return (key, vars) => {
    let s = lookup(dict, key);
    if (s == null) s = lookup(DICTS.en, key);
    if (s == null) return key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = String(s).split(`{${k}}`).join(String(v));
    return String(s);
  };
}

// Bilingual pair: English is always primary; `tr` is the translation, or null
// when the locale is English or the key has no (distinct) translation. Callers
// render `en` prominently and `tr` in a lighter, secondary tone.
export type BiPair = { en: string; tr: string | null };
export type BiFn = (key: string, vars?: Record<string, string | number>) => BiPair;

export function makeBi(locale: string): BiFn {
  const enT = makeT("en");
  const locT = makeT(locale);
  return (key, vars) => {
    const en = enT(key, vars);
    if (locale === "en") return { en, tr: null };
    const tr = locT(key, vars);
    return { en, tr: tr === en ? null : tr };
  };
}
