// A tiny element-wise expression evaluator for the console's `gen` command, e.g.
//   gen logmins = log(minutes)
//   gen size    = height * weight
//   gen ratio   = points / minutes
// Supports + - * / ^, unary minus, parentheses, numeric literals, log()/sqrt(),
// and column identifiers. Returns a new column (one value per row) or an error.

type Tok = { t: "num"; v: number } | { t: "id"; v: string } | { t: "op"; v: string } | { t: "lp" } | { t: "rp" };

function tokenize(src: string): Tok[] | { error: string } {
  const toks: Tok[] = [];
  let i = 0;
  const s = src.replace(/\s+/g, "");
  while (i < s.length) {
    const c = s[i];
    if ("+-*/^".includes(c)) { toks.push({ t: "op", v: c }); i++; continue; }
    if (c === "(") { toks.push({ t: "lp" }); i++; continue; }
    if (c === ")") { toks.push({ t: "rp" }); i++; continue; }
    if (/[0-9.]/.test(c)) {
      let j = i + 1;
      while (j < s.length && /[0-9.eE]/.test(s[j])) j++;
      const v = Number(s.slice(i, j));
      if (!isFinite(v)) return { error: `bad number "${s.slice(i, j)}"` };
      toks.push({ t: "num", v });
      i = j;
      continue;
    }
    if (/[a-zA-Z_]/.test(c)) {
      let j = i + 1;
      while (j < s.length && /[a-zA-Z0-9_]/.test(s[j])) j++;
      toks.push({ t: "id", v: s.slice(i, j) });
      i = j;
      continue;
    }
    return { error: `unexpected character "${c}"` };
  }
  return toks;
}

// Recursive-descent parse → an evaluator function over a row index.
export function evalExpr(src: string, columns: Record<string, number[]>): number[] | { error: string } {
  const toks = tokenize(src);
  if ("error" in toks) return toks;
  const n = columns[Object.keys(columns)[0]]?.length || 0;
  let pos = 0;
  const peek = () => toks[pos];
  let bad: string | null = null;

  // Each parse function returns (i:number)=>number
  type F = (i: number) => number;
  // +/- at the lowest precedence
  function parseAddSub(): F {
    let left = parseTerm();
    while (peek() && peek().t === "op" && ((peek() as any).v === "+" || (peek() as any).v === "-")) {
      const op = (peek() as any).v;
      pos++;
      const r = parseTerm();
      const l = left;
      left = op === "+" ? (i) => l(i) + r(i) : (i) => l(i) - r(i);
    }
    return left;
  }
  function parseTerm(): F {
    let left = parseFactor();
    while (peek() && peek().t === "op" && ((peek() as any).v === "*" || (peek() as any).v === "/")) {
      const op = (peek() as any).v;
      pos++;
      const r = parseFactor();
      const l = left;
      left = op === "*" ? (i) => l(i) * r(i) : (i) => l(i) / r(i);
    }
    return left;
  }
  function parseFactor(): F {
    const base = parseBase();
    if (peek() && peek().t === "op" && (peek() as any).v === "^") {
      pos++;
      const exp = parseFactor(); // right assoc
      return (i) => Math.pow(base(i), exp(i));
    }
    return base;
  }
  function parseBase(): F {
    const tk = peek();
    if (!tk) { bad = "unexpected end of expression"; return () => NaN; }
    if (tk.t === "op" && tk.v === "-") { pos++; const b = parseBase(); return (i) => -b(i); }
    if (tk.t === "num") { pos++; return () => tk.v; }
    if (tk.t === "lp") { pos++; const e = parseAddSub(); if (peek()?.t === "rp") pos++; else bad = "missing )"; return e; }
    if (tk.t === "id") {
      pos++;
      const name = tk.v;
      if (peek()?.t === "lp") {
        pos++;
        const arg = parseAddSub();
        if (peek()?.t === "rp") pos++; else bad = "missing )";
        if (name === "log") return (i) => Math.log(arg(i));
        if (name === "sqrt") return (i) => Math.sqrt(arg(i));
        if (name === "exp") return (i) => Math.exp(arg(i));
        if (name === "abs") return (i) => Math.abs(arg(i));
        bad = `unknown function "${name}()"`;
        return () => NaN;
      }
      if (!columns[name]) { bad = `unknown variable "${name}"`; return () => NaN; }
      return (i) => columns[name][i];
    }
    bad = "couldn't parse expression";
    return () => NaN;
  }

  const fn = parseAddSub();
  if (bad) return { error: bad };
  if (pos !== toks.length) return { error: "trailing characters in expression" };
  const out = new Array(n);
  for (let i = 0; i < n; i++) out[i] = fn(i);
  if (out.some((v) => !isFinite(v))) return { error: "expression produced non-finite values (e.g. log of a non-positive number)" };
  return out;
}
