// Creator identity for attribution. The person owns the work (author_id); the
// institution badge is conferred by LIVE org membership, so it verifies itself
// (a member of the Duke org shows "· Duke University", verified) and travels with
// the person when they move. Server-side (admin client + org membership).
import { createAdminClient } from "./supabase/admin";
import { getMyOrgs } from "./orgs";
import { slugify } from "./moduleBuilder";

export type CreatorIdentity = {
  id: string;
  name: string;
  title?: string;
  institution?: string;        // the org name when verified, else the self-stated field
  institutionLogoUrl?: string; // the org's logo, for the optional "show school logo" toggle
  verified: boolean;           // institution confirmed by current org membership
  bio?: string;
  avatarUrl?: string;
  handle?: string;             // /by/<handle>
};

// Pick the org that best represents someone's teaching affiliation: an org they
// run, else one they instruct in, else any org they belong to.
function primaryOrg(orgs: { org: { name: string; logo_url?: string | null }; role: string }[]): { name: string; logoUrl?: string } | null {
  const pick = (r: string) => orgs.find((m) => m.role === r);
  const m = pick("director") || pick("instructor") || orgs[0];
  return m ? { name: m.org.name, logoUrl: m.org.logo_url || undefined } : null;
}

function toIdentity(p: any, org: { name: string; logoUrl?: string } | null): CreatorIdentity {
  return {
    id: p.id,
    name: p.display_name || "",
    title: p.title || undefined,
    institution: org?.name || p.institution || undefined,
    institutionLogoUrl: org?.logoUrl,
    verified: !!org,
    bio: p.bio || undefined,
    avatarUrl: p.avatar_url || undefined,
    handle: p.handle || undefined,
  };
}

const COLS = "id, display_name, title, institution, bio, avatar_url, handle";

export async function getCreatorIdentity(authorId: string | null | undefined): Promise<CreatorIdentity | null> {
  if (!authorId) return null;
  let admin;
  try { admin = createAdminClient(); } catch { return null; }
  const { data: p } = await admin.from("profiles").select(COLS).eq("id", authorId).maybeSingle();
  if (!p || !(p as any).display_name) return null;
  const orgs = await getMyOrgs(authorId);
  return toIdentity(p, primaryOrg(orgs as any));
}

export async function getCreatorByHandle(handle: string): Promise<CreatorIdentity | null> {
  let admin;
  try { admin = createAdminClient(); } catch { return null; }
  const h = handle.trim().toLowerCase();
  // Accept the raw uuid too, so a byline can always link somewhere.
  const q = admin.from("profiles").select(COLS);
  const { data: p } = /^[0-9a-f-]{36}$/.test(h)
    ? await q.eq("id", h).maybeSingle()
    : await q.ilike("handle", h).maybeSingle();
  if (!p || !(p as any).display_name) return null;
  const orgs = await getMyOrgs((p as any).id);
  return toIdentity(p, primaryOrg(orgs as any));
}

export type ModuleAttribution = { creator: CreatorIdentity; showLogo: boolean };

// The byline for a custom module, but ONLY if the author chose to sign it. Keyed by
// the module's exercise (custom_modules.exercise). Returns null for unsigned or
// built-in modules, so callers can just render when present.
export async function getSignedAttribution(exercise: string | null | undefined): Promise<ModuleAttribution | null> {
  if (!exercise) return null;
  let admin;
  try { admin = createAdminClient(); } catch { return null; }
  const { data } = await admin.from("custom_modules").select("author_id, spec").eq("exercise", exercise).maybeSingle();
  if (!data) return null;
  const spec = ((data as any).spec || {}) as { signedByAuthor?: boolean; showOrgLogo?: boolean };
  if (!spec.signedByAuthor) return null;
  const creator = await getCreatorIdentity((data as any).author_id);
  if (!creator) return null;
  return { creator, showLogo: !!spec.showOrgLogo };
}

// Every signed module a creator has published (for their /by/<handle> page).
export async function listSignedModulesByAuthor(authorId: string): Promise<{ slug: string; name: string; emoji: string; tagline: string }[]> {
  let admin;
  try { admin = createAdminClient(); } catch { return []; }
  const { data } = await admin
    .from("custom_modules")
    .select("slug, name, spec, status")
    .eq("author_id", authorId)
    .eq("status", "published")
    .order("updated_at", { ascending: false });
  return ((data as any[]) || [])
    .filter((m) => (m.spec || {}).signedByAuthor)
    .map((m) => ({ slug: m.slug, name: m.name || (m.spec || {}).name || m.slug, emoji: (m.spec || {}).emoji || "🧭", tagline: (m.spec || {}).tagline || "" }));
}

// Derive a URL handle from a name, unique across profiles. Called when a creator
// saves their profile. Returns the existing handle if they already have one.
export async function ensureHandle(userId: string, name: string): Promise<string | null> {
  let admin;
  try { admin = createAdminClient(); } catch { return null; }
  const { data: me } = await admin.from("profiles").select("handle").eq("id", userId).maybeSingle();
  if ((me as any)?.handle) return (me as any).handle;
  const base = slugify(name) || "creator";
  for (let i = 0; i < 8; i++) {
    const cand = i === 0 ? base : `${base}-${i + 1}`;
    const { data: taken } = await admin.from("profiles").select("id").ilike("handle", cand).neq("id", userId).maybeSingle();
    if (!taken) {
      const { error } = await admin.from("profiles").update({ handle: cand }).eq("id", userId);
      if (!error) return cand;
    }
  }
  return null;
}
