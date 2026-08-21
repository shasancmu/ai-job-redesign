import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles the OAuth / email-confirmation / magic-link redirect: exchanges the
// code for a session, then makes sure the user has a profile row (Google and
// email-confirmation sign-ups never hit the client-side upsert on /login).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const meta: any = user.user_metadata || {};
          const displayName = meta.display_name || meta.full_name || meta.name || (user.email || "").split("@")[0];
          // Insert only if absent, so we never clobber a name the user has edited.
          const { data: existing } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
          if (!existing) await supabase.from("profiles").insert({ id: user.id, display_name: displayName });
        }
      } catch { /* profile is best-effort; never block the redirect */ }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/login`);
}
