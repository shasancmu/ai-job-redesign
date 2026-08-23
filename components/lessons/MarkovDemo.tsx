"use client";

import { useMemo, useState } from "react";

// A working n-gram (Markov) text generator. Given a small corpus, it predicts
// the next word by sampling from what followed the last `order` words in the
// text. Order 1 = gibberish-ish; higher order = more coherent but, on a tiny
// corpus, it starts to just copy the source, the data bottleneck, live.
const CORPUS = `A startup that runs experiments learns faster than one that guesses.
The founders who test their ideas early avoid building things nobody wants.
A good experiment changes a belief, so a startup that runs experiments changes its mind when the data says so.
Experiments are cheap now, so the founders who run experiments beat the founders who trust their instincts.
But experiments only help a team that can act on what it learns.
So a startup that runs experiments and acts on them learns faster and builds things people want.`;

function tokenize(s: string): string[] {
  return s.replace(/\s+/g, " ").trim().split(" ");
}

export default function MarkovDemo() {
  const [order, setOrder] = useState(2);
  const [out, setOut] = useState<string>("");

  const words = useMemo(() => tokenize(CORPUS), []);
  const model = useMemo(() => {
    const m = new Map<string, string[]>();
    for (let i = 0; i + order < words.length; i++) {
      const key = words.slice(i, i + order).join(" ").toLowerCase();
      const next = words[i + order];
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(next);
    }
    return m;
  }, [words, order]);

  function generate() {
    const starts = [...model.keys()];
    if (!starts.length) { setOut("(need more text)"); return; }
    // deterministic-enough randomness for a demo
    let key = starts[Math.floor(Math.random() * starts.length)];
    const result = key.split(" ");
    for (let n = 0; n < 32; n++) {
      const nexts = model.get(key);
      if (!nexts || !nexts.length) break;
      const w = nexts[Math.floor(Math.random() * nexts.length)];
      result.push(w);
      key = result.slice(result.length - order).join(" ").toLowerCase();
    }
    let text = result.join(" ");
    text = text.charAt(0).toUpperCase() + text.slice(1);
    setOut(text);
  }

  return (
    <div className="my-6 rounded-2xl border border-line bg-white p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Try it: a Markov text generator</div>
      <p className="mt-1 text-sm text-slate-500">It only ever looks at the last {order} word{order === 1 ? "" : "s"} to pick the next one. That short, fixed memory is the whole idea, and the whole limit.</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-500">Memory:</span>
        {[1, 2, 3].map((o) => (
          <button key={o} onClick={() => { setOrder(o); setOut(""); }} className={"rounded-full border px-3 py-1 text-sm font-medium transition " + (order === o ? "border-transparent bg-ink text-white" : "border-line text-slate-600 hover:border-slate-300")}>
            {o} word{o === 1 ? "" : "s"}
          </button>
        ))}
        <button onClick={generate} className="btn-primary ml-auto text-sm">Generate →</button>
      </div>

      {out && <div className="mt-3 rounded-xl bg-mist p-3 font-serif text-[15px] leading-relaxed text-ink">{out}</div>}

      <p className="mt-3 text-xs text-slate-400">
        1 word: mostly nonsense. 2–3 words: more fluent, but on this tiny corpus it soon just copies whole sentences. Real language needs a
        far longer memory and far more text, which is exactly what a Transformer and a huge dataset provide.
      </p>
    </div>
  );
}
