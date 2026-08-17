// Server-only: resolve the current locale from the authenticated user's profile.
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { localeFromLanguage } from "@/lib/i18n";
import { I18N_ENABLED } from "@/lib/flags";

// Cached per request so multiple server components don't re-query.
export const getServerLocale = cache(async (): Promise<string> => {
  if (!I18N_ENABLED) return "en";
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
