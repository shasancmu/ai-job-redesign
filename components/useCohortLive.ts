"use client";

import { useEffect, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

// Live cohort channel for the facilitator cockpit.
//
// A facilitator can't SELECT a participant's session row under RLS (the "sessions
// read" policy is host/guest-only), so postgres_changes can't carry participant
// progress to them. Realtime BROADCAST is not RLS-gated, so instead each
// participant room pings a shared cohort channel whenever its phase/status
// changes, and the cockpit refetches its authoritative (service-role) state on
// each ping. Payload carries nothing sensitive, just a nudge to refetch.
export function cohortChannelName(cohort?: string | null): string | null {
  return cohort ? `cohort-live:${cohort}` : null;
}

// Participant-side: returns a ping() to call after a phase/status change.
export function useCohortPing(cohort?: string | null): () => void {
  const supabase = useMemo(() => createClient(), []);
  const chanRef = useRef<any>(null);
  const ready = useRef(false);

  useEffect(() => {
    const name = cohortChannelName(cohort);
    if (!name) return;
    const ch = supabase.channel(name, { config: { broadcast: { self: false } } });
    ch.subscribe((status: string) => { ready.current = status === "SUBSCRIBED"; });
    chanRef.current = ch;
    return () => {
      ready.current = false;
      try { supabase.removeChannel(ch); } catch { /* already gone */ }
    };
  }, [cohort, supabase]);

  return () => {
    const ch = chanRef.current;
    if (ch && ready.current) {
      try { ch.send({ type: "broadcast", event: "progress", payload: {} }); } catch { /* not connected */ }
    }
  };
}
