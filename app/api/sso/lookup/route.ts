import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Pre-auth: does this email's domain route to an org's SSO? The login page calls
// this so it can offer "Sign in with your organization" for enterprise domains.
// Reveals only whether a domain has SSO and the org's display name — nothing
// sensitive, and nothing about any account.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = (url.searchParams.get("email") || "").trim().toLowerCase();
  const domain = (url.searchParams.get("domain") || (email.includes("@") ? email.split("@")[1] : "")).trim().toLowerCase().replace(/^@/, "");
  if (!domain || !domain.includes(".")) return Response.json({ sso: false });

  try {
    const admin = createAdminClient();
    const { data } = await admin.from("organizations").select("name, sso_domain").ilike("sso_domain", domain).maybeSingle();
    if (data?.sso_domain) return Response.json({ sso: true, domain, org: (data as any).name || null });
  } catch { /* column not migrated / transient → no SSO */ }
  return Response.json({ sso: false });
}
