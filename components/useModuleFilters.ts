"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

// Filter state used to live only in React, so a filtered view of the library
// couldn't be shared or bookmarked, and Back left the page instead of undoing
// the filter. This keeps the same state but mirrors it in the query string.
//
// Two-way, guarded by comparing serialised values in both directions so a write
// can't bounce back as a read and loop. Pill toggles push (Back undoes one);
// typing replaces, debounced, so a search doesn't flood history.
const KEYS = { query: "q", topics: "topic", features: "format" } as const;

const split = (v: string | null) => (v ? v.split(",").filter(Boolean) : []);
const ser = (s: Set<string>) => [...s].sort().join(",");

function toQuery(query: string, topics: Set<string>, features: Set<string>, base: URLSearchParams) {
  const next = new URLSearchParams(base);
  const set = (k: string, v: string) => (v ? next.set(k, v) : next.delete(k));
  set(KEYS.query, query.trim());
  set(KEYS.topics, ser(topics));
  set(KEYS.features, ser(features));
  return next;
}

export function useModuleFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [query, setQuery] = useState(() => params.get(KEYS.query) || "");
  const [topics, setTopics] = useState<Set<string>>(() => new Set(split(params.get(KEYS.topics))));
  const [features, setFeatures] = useState<Set<string>>(() => new Set(split(params.get(KEYS.features))));

  // URL → state: Back/Forward, or a shared link opened in place.
  const fromUrl = `${params.get(KEYS.query) || ""}|${params.get(KEYS.topics) || ""}|${params.get(KEYS.features) || ""}`;
  useEffect(() => {
    const [q, t, f] = fromUrl.split("|");
    setQuery((cur) => (cur.trim() === q ? cur : q));
    setTopics((cur) => (ser(cur) === t ? cur : new Set(split(t))));
    setFeatures((cur) => (ser(cur) === f ? cur : new Set(split(f))));
  }, [fromUrl]);

  // state → URL. The query is debounced; pills write immediately.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const write = useCallback(
    (q: string, t: Set<string>, f: Set<string>, mode: "push" | "replace") => {
      const next = toQuery(q, t, f, params);
      if (next.toString() === params.toString()) return;
      const url = next.toString() ? `${pathname}?${next}` : pathname;
      router[mode](url, { scroll: false });
    },
    [params, pathname, router]
  );

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => write(query, topics, features, "replace"), 350);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  const flip = (s: Set<string>, k: string) => {
    const n = new Set(s);
    n.has(k) ? n.delete(k) : n.add(k);
    return n;
  };

  const togglePill = (k: string) => {
    const n = flip(topics, k);
    setTopics(n);
    write(query, n, features, "push");
  };

  const toggleFeature = (k: string) => {
    const n = flip(features, k);
    setFeatures(n);
    write(query, topics, n, "push");
  };

  const clearFilters = () => {
    setQuery(""); setTopics(new Set()); setFeatures(new Set());
    write("", new Set(), new Set(), "push");
  };

  return { query, setQuery, topics, features, togglePill, toggleFeature, clearFilters };
}
