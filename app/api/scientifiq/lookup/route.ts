import { createClient } from "@/lib/supabase/server";
import { SCIENTIFIQ_ENABLED, searchOrganizations, searchCountries } from "@/lib/scientifiq";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Autocomplete for the scope picker: institutions (with their affiliated orgs)
// or countries. Auth-gated. GET /api/scientifiq/lookup?type=org|country&q=...
export async function GET(request: Request) {
  if (!SCIENTIFIQ_ENABLED) return Response.json({ results: [] });
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") === "country" ? "country" : "org";
  const q = (searchParams.get("q") || "").trim().slice(0, 100);
  if (q.length < 2) return Response.json({ results: [] });

  try {
    const results = type === "country" ? await searchCountries(q, 12) : await searchOrganizations(q, 20);
    return Response.json({ results });
  } catch {
    return Response.json({ results: [] });
  }
}
