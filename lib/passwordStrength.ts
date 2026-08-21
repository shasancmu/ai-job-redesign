// Lightweight password-strength estimation, no dependency. This is UX only: it
// guides people toward a strong password and blocks the obviously weak ones
// before the round-trip. The authoritative gate is Supabase's server policy
// (minimum length + leaked-password / HaveIBeenPwned check), which must be
// turned on in the dashboard. Philosophy is NIST-ish: reward length, don't force
// arcane composition rules, and reject known-bad passwords.

export const MIN_PASSWORD_LENGTH = 8;

// A small set of the most common passwords (and a few app-specific guesses).
// The real breach check lives server-side; this just catches the worst offenders
// instantly.
const COMMON = new Set([
  "password", "password1", "password123", "passw0rd", "123456", "1234567",
  "12345678", "123456789", "1234567890", "12345", "111111", "000000",
  "123123", "qwerty", "qwerty123", "abc123", "admin", "letmein", "welcome",
  "monkey", "iloveyou", "dragon", "sunshine", "football", "changeme",
  "superadditive", "superadditive1", "test1234", "google",
]);

export type PwStrength = {
  score: 0 | 1 | 2 | 3 | 4; // 0 worst .. 4 strong
  label: string;
  ok: boolean; // passes the client-side minimum policy
  hint: string; // the single most useful next step (empty when strong)
};

export function scorePassword(pw: string): PwStrength {
  const p = pw || "";
  const len = p.length;
  if (len === 0) return { score: 0, label: "", ok: false, hint: "" };

  const lower = /[a-z]/.test(p);
  const upper = /[A-Z]/.test(p);
  const digit = /\d/.test(p);
  const symbol = /[^A-Za-z0-9]/.test(p);
  const variety = [lower, upper, digit, symbol].filter(Boolean).length;
  const common = COMMON.has(p.toLowerCase());
  const repeated = /(.)\1{2,}/.test(p); // "aaa"
  const sequential = /(0123|1234|2345|3456|4567|5678|6789|abcd|bcde|qwer|asdf|zxcv)/i.test(p);

  let score = 0;
  if (len >= MIN_PASSWORD_LENGTH) score++;
  if (len >= 12) score++;
  if (variety >= 2) score++;
  if (variety >= 3 && len >= 10) score++;
  if (repeated || sequential) score = Math.max(0, score - 1);
  if (common) score = 0;
  const clamped = Math.max(0, Math.min(4, score)) as 0 | 1 | 2 | 3 | 4;

  const labels = ["Too weak", "Weak", "Fair", "Good", "Strong"];
  const ok = len >= MIN_PASSWORD_LENGTH && !common && clamped >= 2;

  let hint = "";
  if (common) hint = "That's a commonly used password. Choose something unique.";
  else if (len < MIN_PASSWORD_LENGTH) hint = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  else if (repeated || sequential) hint = "Avoid repeated or sequential characters.";
  else if (len < 12) hint = "Longer is stronger. A short phrase of a few words is easy to remember.";
  else if (variety < 2) hint = "Add another word or a number to strengthen it.";

  return { score: clamped, label: labels[clamped], ok, hint };
}
