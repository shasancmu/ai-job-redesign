"use client";

import { createContext, useContext, useMemo } from "react";
import { makeT, type T } from "@/lib/i18n";

const TCtx = createContext<T>((k) => k);

export function I18nProvider({ locale, children }: { locale: string; children: React.ReactNode }) {
  const t = useMemo(() => makeT(locale), [locale]);
  return <TCtx.Provider value={t}>{children}</TCtx.Provider>;
}

export function useT(): T {
  return useContext(TCtx);
}
