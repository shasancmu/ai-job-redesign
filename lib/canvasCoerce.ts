// Shape-tolerant coercion for canvas list/pairs values. The AI draft is asked for
// plain strings (lists) and { a, b } objects (pairs), but LLMs occasionally return
// objects, nulls, or alternate keys. Without this, a stray object rendered as
// "[object Object]" and a null/missing entry as the literal "undefined" (the
// studio-report bug). Plain module (no server imports) so client renderers can use
// it defensively on already-stored data too.

// Turn one list item into a clean display line; empties become "" (callers drop them).
export function coerceLine(x: any): string {
  if (x == null) return "";
  if (typeof x === "string") return x.trim();
  if (typeof x === "number" || typeof x === "boolean") return String(x);
  if (typeof x === "object") {
    const keyed = x.text ?? x.label ?? x.value ?? x.name ?? x.point ?? x.item ?? x.title ?? x.description ?? x.detail;
    if (typeof keyed === "string" && keyed.trim()) return keyed.trim();
    const parts = Object.values(x).filter((v) => typeof v === "string" && v.trim()) as string[];
    return parts.join(": ").trim();
  }
  return "";
}

// Coerce one item into a { a, b } pair. Tolerates a plain string (left only), the
// requested { a, b }, or an object that used different keys.
export function coercePair(x: any): { a: string; b: string } {
  if (typeof x === "string") return { a: x.trim(), b: "" };
  if (x && typeof x === "object") {
    const a = x.a ?? x.left ?? x.label ?? x.name ?? x.key ?? x.criterion ?? x.path ?? x.title;
    const b = x.b ?? x.right ?? x.value ?? x.position ?? x.description ?? x.detail ?? x.note;
    if (a == null && b == null) {
      const strs = Object.values(x).filter((v) => typeof v === "string") as string[];
      return { a: (strs[0] || "").trim(), b: (strs[1] || "").trim() };
    }
    return { a: a == null ? "" : String(a).trim(), b: b == null ? "" : String(b).trim() };
  }
  return { a: "", b: "" };
}
