"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type SaveState = "clean" | "dirty" | "saving" | "saved" | "error";

// Keep an author's work. The learner-facing rooms have always debounce-saved
// the workspace as someone types; the authoring editors saved only when you
// pressed the button, so a draft could be lost to a stray click on the header.
//
// Two deliberate differences from the explicit Save button:
//   - No validation gate. A half-finished draft is exactly what most needs
//     keeping, and refusing to store it is how the work disappears.
//   - Never changes status. Autosave writes a draft; publishing stays a
//     decision the author makes on purpose.
export function useDraftAutosave({
  table,
  slug,
  ownerId,
  spec,
  enabled = true,
  delayMs = 1200,
}: {
  table: string;
  slug: string | undefined;
  ownerId: string;
  spec: any;
  enabled?: boolean;
  delayMs?: number;
}): { state: SaveState; savedAt: Date | null } {
  const [state, setState] = useState<SaveState>("clean");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef<string>("");
  const first = useRef(true);

  const serialized = JSON.stringify(spec ?? null);

  useEffect(() => {
    if (!enabled || !slug || !spec) return;
    // Treat whatever we were handed on mount as already-persisted; the flow that
    // generated it writes it down before the editor renders.
    if (first.current) { first.current = false; lastSaved.current = serialized; return; }
    if (serialized === lastSaved.current) return;

    setState("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setState("saving");
      try {
        const { error } = await createClient()
          .from(table)
          .upsert(
            { slug, version: 1, owner_id: ownerId, spec, updated_at: new Date().toISOString() },
            { onConflict: "slug,version" }
          );
        if (error) { setState("error"); return; }
        lastSaved.current = serialized;
        setSavedAt(new Date());
        setState("saved");
      } catch {
        setState("error");
      }
    }, delayMs);

    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [serialized, enabled, slug, table, ownerId, delayMs]); // eslint-disable-line react-hooks/exhaustive-deps

  // Last line of defence: a close or reload while an edit is still in the
  // debounce window would otherwise take it with them.
  useEffect(() => {
    if (state !== "dirty" && state !== "saving") return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [state]);

  return { state, savedAt };
}
