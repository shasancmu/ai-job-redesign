"use client";

import { createContext, useContext, useMemo } from "react";
import { makeT, makeBi, type T, type BiFn } from "@/lib/i18n";

const TCtx = createContext<T>((k) => k);
const BiCtx = createContext<BiFn>((k) => ({ en: k, tr: null }));

export function I18nProvider({ locale, children }: { locale: string; children: React.ReactNode }) {
  const t = useMemo(() => makeT(locale), [locale]);
  const bi = useMemo(() => makeBi(locale), [locale]);
  return (
    <TCtx.Provider value={t}>
      <BiCtx.Provider value={bi}>{children}</BiCtx.Provider>
    </TCtx.Provider>
  );
}

export function useT(): T {
  return useContext(TCtx);
}

// Bilingual resolver: returns { en, tr } for rendering with <Bi>.
export function useBi(): BiFn {
  return useContext(BiCtx);
}
