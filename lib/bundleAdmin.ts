import { MODULES } from "@/lib/modules";
import { BUNDLES } from "@/lib/credentials";

// Shared validation for the bundle-authoring routes (superadmin + director).

const VALID = new Set(MODULES.filter((m) => m.partner !== "group").map((m) => m.slug));
const BUILTIN_KEYS = new Set(BUNDLES.map((b) => b.key));

export function slugify(s: string): string {
  return (
    String(s || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "bundle"
  );
}

// Clean + validate the shared bundle fields. Core and electives are disjoint,
// only real modules, and electivesNeeded is clamped to what's available.
export function cleanBundle(body: any) {
  const core = (Array.isArray(body.core) ? body.core : []).filter((s: string) => VALID.has(s));
  const electives = (Array.isArray(body.electives) ? body.electives : []).filter(
    (s: string) => VALID.has(s) && !core.includes(s),
  );
  const skills = (Array.isArray(body.skills) ? body.skills : [])
    .map((s: string) => String(s).trim())
    .filter(Boolean)
    .slice(0, 8);
  const electivesNeeded = Math.max(0, Math.min(electives.length, parseInt(body.electivesNeeded, 10) || 0));
  return {
    name: String(body.name || "").trim().slice(0, 80),
    line: String(body.line || "").trim().slice(0, 200),
    core,
    electives,
    electives_needed: electivesNeeded,
    skills,
    active: body.active !== false,
  };
}

// Pick a unique key not used by a built-in or another row.
export async function uniqueKey(admin: any, base: string, ownId?: string): Promise<string> {
  const { data } = await admin.from("bundles").select("id,key");
  const taken = new Set<string>(BUILTIN_KEYS);
  for (const r of (data as any[]) || []) if (r.id !== ownId) taken.add(r.key);
  let key = slugify(base);
  let n = 2;
  while (taken.has(key)) key = `${slugify(base)}-${n++}`;
  return key;
}
