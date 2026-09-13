// The shared shape behind every authored-engine store.
//
// Each mechanics store (analytical, news, benchmark, negotiation, redesign,
// explainer, roleplay) had two near-identical pieces copy-pasted into it: a
// loader that reads the latest spec row for a slug, and a catalog lister that
// pulls published rows, dedupes by slug, and maps each to a card entry. Only the
// per-kind `public*` projector and `validate*` differ, so those stay in each
// store; these two factories replace the boilerplate.
//
// Server-only (admin client). Loaders are wrapped in React `cache()` so the page
// and its generateMetadata share one query per request.
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";

// Reads the latest version of a spec by slug from `table`.select("spec").
// `coerce` transforms the stored JSON (e.g. benchmark coercion); `fallback`
// supplies a built-in/static spec when nothing is stored (e.g. seeded scenarios).
export function makeSpecLoader<T>(
  table: string,
  opts: { coerce?: (spec: any) => T | null; fallback?: (slug: string) => T | null } = {},
): (slug: string) => Promise<T | null> {
  const load = async (slug: string): Promise<T | null> => {
    const s = String(slug || "").toLowerCase();
    try {
      const { data } = await createAdminClient()
        .from(table).select("spec").eq("slug", s)
        .order("version", { ascending: false }).limit(1).maybeSingle();
      if (data?.spec) return opts.coerce ? opts.coerce(data.spec) : (data.spec as T);
    } catch { /* table missing or RLS — fall through */ }
    return opts.fallback ? opts.fallback(s) : null;
  };
  return cache(load);
}

// Lists published specs from `table`, latest first, deduped by slug, each mapped
// to a catalog entry by `map`. Pass `exclude` to drop slugs (e.g. static/built-in
// modules that run through a different path). Optional `ownerId` scopes to author.
export function makeCatalogLister<E>(
  table: string,
  map: (row: { slug: string; spec: any; owner_id: string | null }) => E,
  opts: { exclude?: () => Set<string> } = {},
): (ownerId?: string) => Promise<E[]> {
  return async (ownerId?: string): Promise<E[]> => {
    try {
      const admin = createAdminClient();
      let q = admin.from(table).select("slug, spec, owner_id").eq("status", "published").order("updated_at", { ascending: false });
      if (ownerId) q = q.eq("owner_id", ownerId);
      const { data } = await q;
      const skip = opts.exclude ? opts.exclude() : null;
      const seen = new Set<string>();
      const out: E[] = [];
      for (const r of ((data as any[]) || [])) {
        if (seen.has(r.slug) || (skip && skip.has(r.slug))) continue;
        seen.add(r.slug);
        out.push(map(r));
      }
      return out;
    } catch { return []; }
  };
}
