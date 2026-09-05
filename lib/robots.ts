// Only the public marketing / landing / legal pages should be crawled and
// indexed. Everything else — the app itself and all user-generated content
// (cases, reports, rooms, dashboards) — is kept out of search engines and out of
// their cache/archive. Edit INDEXABLE_PREFIXES to expose more marketing pages.

export const INDEXABLE_PREFIXES = [
  "/lp",              // marketing landing pages
  "/for-teams",
  "/frameworks",
  "/overview",
  "/relationship-os",
  "/welcome",
  "/try",
  "/contact",
  // legal / policy pages
  "/privacy",
  "/terms",
  "/cookies",
  "/dpa",
  "/sub-processors",
  "/data-collection",
];

// The home page ("/") plus anything under an indexable prefix is public.
export function isIndexablePath(pathname: string): boolean {
  if (pathname === "/") return true;
  return INDEXABLE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}
