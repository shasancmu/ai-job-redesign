"use client";

import { useEffect } from "react";

// Records the very first referrer + UTM params to localStorage, once, so we can
// attribute where a user came from even after they navigate around. Passive,
// low-sensitivity; read later by EnrichOnce. Renders nothing.
export default function FirstTouch() {
  useEffect(() => {
    try {
      if (localStorage.getItem("sa_first_touch")) return;
      const p = new URLSearchParams(window.location.search);
      const utm = {
        source: p.get("utm_source") || "",
        medium: p.get("utm_medium") || "",
        campaign: p.get("utm_campaign") || "",
      };
      localStorage.setItem(
        "sa_first_touch",
        JSON.stringify({ referrer: document.referrer || "", utm })
      );
    } catch {
      /* private mode / blocked storage — ignore */
    }
  }, []);
  return null;
}
