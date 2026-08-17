// ============================================================================
// Request-scoped language for AI output. A route wraps its AI call in
// withLanguage(lang, () => ...); complete() (lib/ai.ts) reads currentLanguage()
// and appends a directive to the system prompt. No AI function signatures change.
// ============================================================================
import { AsyncLocalStorage } from "node:async_hooks";

const store = new AsyncLocalStorage<string>();

function isEnglish(lang: string) {
  return /^(english|en)$/i.test(lang.trim());
}

export function withLanguage<T>(language: string | undefined | null, fn: () => Promise<T>): Promise<T> {
  const lang = (language || "").trim();
  if (!lang || isEnglish(lang)) return fn();
  return store.run(lang, fn);
}

export function currentLanguage(): string | undefined {
  return store.getStore();
}

// Look up the authenticated user's preferred language (defaults to English).
export async function getUserLanguage(supabase: any, userId?: string): Promise<string | undefined> {
  if (!userId) return undefined;
  try {
    const { data } = await supabase.from("profiles").select("language").eq("id", userId).maybeSingle();
    const lang = data?.language;
    return lang && !isEnglish(lang) ? lang : undefined;
  } catch {
    return undefined;
  }
}
