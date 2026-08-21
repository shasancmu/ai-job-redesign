import { AsyncLocalStorage } from "async_hooks";

// Per-request "which module/step is this AI call for?", read by lib/ai.ts when it
// writes an ai_events row, so cost and errors break down per module. A route
// calls setFlow("consult:chat") once and every complete() in that request picks
// it up. enterWith needs no wrapper and is request-scoped (each HTTP request runs
// in its own async context), so wiring a route is a single line.
const store = new AsyncLocalStorage<string>();

export function setFlow(flow: string): void {
  try { store.enterWith(flow); } catch { /* runtime without ALS.enterWith */ }
}

export function currentFlow(): string | null {
  return store.getStore() ?? null;
}
