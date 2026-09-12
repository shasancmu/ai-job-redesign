// Server-only: resolve the current locale from the authenticated user's profile.
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { localeFromLanguage } from "@/lib/i18n";
import { AI_LANG_ENABLED } from "@/lib/flags";

// Cached per request so multiple server components don't re-query. When AI-language
// is on, the whole static UI (buttons, step titles, field labels — all the tf()
// strings, already translated in messages/*.json) follows the learner's profile
// language, so a module reads end-to-end in their language, not just the AI output.
export const getServerLocale = cache(async (): Promise<string> => {
  if (!AI_LANG_ENABLED) return "en";
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return "en";
    const { data } = await supabase.from("profiles").select("language").eq("id", user.id).maybeSingle();
    return localeFromLanguage(data?.language);
  } catch {
    return "en";
  }
});
