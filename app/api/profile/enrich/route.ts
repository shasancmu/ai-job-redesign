import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { classifyEmail } from "@/lib/segments";

// Records passive signals about the user — never asked, low-sensitivity.
// Called once from the client on first onboarding/dashboard load. Only fills
// columns that are still empty, so re-calls are cheap and non-destructive.
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await request.json().catch(() => ({}));

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_type, country, device, referrer, utm")
    .eq("id", user.id)
    .maybeSingle();

  const patch: Record<string, any> = {};

  if (!profile?.org_type) {
    const { type, domain } = classifyEmail(user.email);
    patch.org_type = type;
    patch.org_domain = domain;
  }
  if (!profile?.country) {
    // Hosting geo header (Vercel). No raw IP is stored.
    const country =
      request.headers.get("x-vercel-ip-country") ||
      request.headers.get("cf-ipcountry") ||
      "";
    if (country) patch.country = country;
  }
  if (!profile?.device && typeof body.device === "string") {
    patch.device = body.device === "mobile" ? "mobile" : "desktop";
  }
  if (!profile?.referrer && typeof body.referrer === "string" && body.referrer) {
    patch.referrer = body.referrer.slice(0, 300);
  }
  if (!profile?.utm && body.utm && typeof body.utm === "object") {
    const { source, medium, campaign } = body.utm;
    if (source || medium || campaign) patch.utm = { source, medium, campaign };
  }

  if (Object.keys(patch).length > 0) {
    await supabase.from("profiles").update(patch).eq("id", user.id);
  }
  return NextResponse.json({ ok: true, filled: Object.keys(patch) });
}
