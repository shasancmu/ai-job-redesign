"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeCode } from "@/lib/classes";

// The one way into a class was a URL someone handed you — there was nowhere in
// the product to type a code, so "go to superadditive.app and enter ABCDE" had
// no answer. This is that field. It resolves through /[code], which shows the
// class (or says it can't find it).
export default function ClassCodeEntry({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const clean = normalizeCode(code);

  function go(e: React.FormEvent) {
    e.preventDefault();
    if (!clean) return;
    setBusy(true);
    router.push(`/${clean}`);
  }

  return (
    <form onSubmit={go} className={compact ? "flex items-center gap-2" : "flex flex-wrap items-center gap-2"}>
      <label htmlFor="class-code" className="sr-only">
        Class or workshop code
      </label>
      <input
        id="class-code"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="Class code"
        autoComplete="off"
        spellCheck={false}
        maxLength={12}
        className="field w-36 font-mono tracking-widest"
      />
      <button type="submit" disabled={!clean || busy} className="btn-dark disabled:opacity-40">
        {busy ? "Opening…" : "Join"}
      </button>
    </form>
  );
}
