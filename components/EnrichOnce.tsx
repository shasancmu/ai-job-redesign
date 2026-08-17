"use client";

import { useEffect } from "react";

// Fires the passive-signal enrichment once per browser session. Sends device +
// the recorded first-touch referrer/UTM; the server fills only empty columns
// (org type/domain, country, device, referrer, utm). Renders nothing.
export default function EnrichOnce() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem("sa_enriched")) return;
      sessionStorage.setItem("sa_enriched", "1");
    } catch {
      /* ignore */
    }
    const isMobile =
      typeof window !== "undefined" &&
      (window.matchMedia?.("(max-width: 768px)").matches ||
        /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent));
    let first: any = {};
    try {
      first = JSON.parse(localStorage.getItem("sa_first_touch") || "{}");
    } catch {
      /* ignore */
    }
    fetch("/api/profile/enrich", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        device: isMobile ? "mobile" : "desktop",
        referrer: first.referrer || "",
        utm: first.utm || {},
      }),
    }).catch(() => {});
  }, []);
  return null;
}
