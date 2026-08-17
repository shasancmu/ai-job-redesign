"use client";

import { createContext, useContext, useMemo } from "react";
import { makeT, type T } from "@/lib/i18n";

const Ctx = createContext<T>((k) => k);

export function I18nProvider({ locale, children }: { locale: string; children: React.ReactNode }) {
  const t = useMemo(() => makeT(locale), [locale]);
  return <Ctx.Provider value={t}>{children}</Ctx.Provider>;
}

export function useT(): T {
  return useContext(Ctx);
}
