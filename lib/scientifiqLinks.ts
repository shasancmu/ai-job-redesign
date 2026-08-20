// Client-safe outbound links back into Scientifiq for deeper drill-down.
// Kept separate from lib/scientifiq.ts (which is server-only and holds the API
// key) so these can be imported into report components without bundling the
// server client.
//
// URL formats confirmed against the live app:
//   /researcher/{name-slug}-{id}   (a bare /researcher/{id} also resolves)
//   /paper/{title-slug}-{id}
//   /patent/{title-slug}-{id}      (inferred from the same convention)
//   /search?search={query}
// IDs are the OpenAlex-style ids the API returns (A… authors, W… works).

const APP = (process.env.NEXT_PUBLIC_SCIENTIFIQ_APP_URL || "https://app.scientifiq.ai").replace(/\/$/, "");

// Match Scientifiq's slugs: lowercase, strip accents, non-alphanumerics → "-".
function slug(s?: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140);
}

function entity(kind: string, id?: string, label?: string): string {
  if (!id) return APP;
  const s = slug(label);
  return `${APP}/${kind}/${s ? `${s}-${id}` : id}`;
}

export const sciLink = {
  researcher: (id?: string, name?: string) => entity("researcher", id, name),
  paper: (id?: string, title?: string) => entity("paper", id, title),
  patent: (id?: string, title?: string) => entity("patent", id, title),
  search: (q: string) => `${APP}/search?search=${encodeURIComponent(q)}`,
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
