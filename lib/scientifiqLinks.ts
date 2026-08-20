// Client-safe outbound links back into Scientifiq for deeper drill-down.
// Kept separate from lib/scientifiq.ts (which is server-only and holds the API
// key) so these can be imported into report components without bundling the
// server client. IDs are the same OpenAlex-style ids the API returns.
//
// NOTE: the app routes are assumed to mirror the API paths. If Scientifiq's app
// uses different paths, change them here in ONE place (or set
// NEXT_PUBLIC_SCIENTIFIQ_APP_URL).

const APP = (process.env.NEXT_PUBLIC_SCIENTIFIQ_APP_URL || "https://app.scientifiq.ai").replace(/\/$/, "");

export const sciLink = {
  researcher: (id?: string) => (id ? `${APP}/researchers/${encodeURIComponent(id)}` : APP),
  paper: (id?: string) => (id ? `${APP}/papers/${encodeURIComponent(id)}` : APP),
  patent: (id?: string) => (id ? `${APP}/patents/${encodeURIComponent(id)}` : APP),
  search: (q: string) => `${APP}/search?q=${encodeURIComponent(q)}`,
};

// A small "open on Scientifiq" affordance used across the science reports.
import type { ReactNode } from "react";
import { createElement } from "react";

export function SciLink({ href, children = "Scientifiq", className }: { href: string; children?: ReactNode; className?: string }) {
  return createElement(
    "a",
    {
      href,
      target: "_blank",
      rel: "noopener noreferrer",
      className: className || "inline-flex items-center gap-0.5 text-xs font-medium text-sky hover:underline",
    },
    children,
    createElement(
      "svg",
      { width: 11, height: 11, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.5, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true },
      createElement("path", { d: "M7 17 17 7M9 7h8v8" })
    )
  );
}
