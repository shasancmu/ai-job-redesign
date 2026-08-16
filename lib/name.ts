// Normalize a person's name to proper case: "sHARIQUE  hASAN" -> "Sharique Hasan",
// "mary-jane o'brien" -> "Mary-Jane O'Brien". Capitalizes the first letter after
// the start, a space, a hyphen, or an apostrophe.
export function titleCaseName(raw: string): string {
  return String(raw || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/(^|[\s'’-])([a-z])/g, (_m, sep, ch) => sep + ch.toUpperCase());
}
