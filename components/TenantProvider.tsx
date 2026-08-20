"use client";

import { createContext, useContext, type ReactNode } from "react";

// The active white-label brand for this request, resolved server-side (from the
// user's org membership) and handed to the client so shared UI like <Logo> can
// theme itself. null = the default Superadditive brand.
export type TenantBrand = { name: string; logoUrl: string | null; color: string | null; slug: string } | null;

const TenantContext = createContext<TenantBrand>(null);

export function TenantProvider({ value, children }: { value: TenantBrand; children: ReactNode }) {
  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant(): TenantBrand {
  return useContext(TenantContext);
}
