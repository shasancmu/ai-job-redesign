// Live Quiz (anonymous benchmark) helpers. Questions + scoring are reused from
// lib/benchmark.ts; this only adds the standalone session code.

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function makeQuizCode(len = 5): string {
  let out = "";
  for (let i = 0; i < len; i++) out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return out;
}
