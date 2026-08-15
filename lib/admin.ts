// Facilitators are identified by an email allowlist in the ADMIN_EMAILS env var
// (comma-separated). Only these users can reach /facilitator and read cohort
// data. Checked on the server — never trust the client for this.
export function isAdmin(email?: string | null): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

export const UNTAGGED = "__untagged__";
