"use client";

import { createClient } from "@/lib/supabase/client";
import { AUTHOR_FORMATS } from "@/lib/authorFormats";

// Persist a freshly generated spec as a draft BEFORE the editor renders.
//
// Generation takes a minute or two. The author who waits that long has not yet
// had a chance to press Save, so anything that navigates away — the header's
// own links included — used to discard the whole thing. Writing it down the
// moment it exists means the worst case is an unpolished draft in "Your
// modules", never an empty one.
//
// Best-effort by design: if the write fails the author still reaches the editor
// with their spec in hand, exactly as before. Returns whether it was saved so
// the caller can tell them the truth.
export async function saveNewDraft(formatId: string, spec: any, ownerId: string): Promise<boolean> {
  const fmt = AUTHOR_FORMATS.find((f) => f.id === formatId);
  if (!fmt || !spec?.slug) return false;

  try {
    // Guided-interview modules live in custom_modules behind their own route.
    if (!fmt.table) {
      const res = await fetch("/api/builder/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spec, status: "draft" }),
      });
      return res.ok;
    }

    const { error } = await createClient()
      .from(fmt.table)
      .upsert(
        {
          slug: spec.slug,
          version: 1,
          owner_id: ownerId,
          status: "draft",
          spec,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "slug,version" }
      );
    return !error;
  } catch {
    return false;
  }
}
