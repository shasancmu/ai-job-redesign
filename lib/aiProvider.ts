import { AsyncLocalStorage } from "async_hooks";

// A per-request AI provider override. An org (e.g. a university with FERPA
// obligations) can point the platform at its OWN self-hosted models + key, so
// student data never reaches the shared/public model. The AI layer resolves the
// acting org's provider lazily on the first AI call of a request (see
// lib/orgAi.resolveRequestAiProvider) and then routes every non-vision text call
// to it EXCLUSIVELY — no fallback to the platform model (fail-closed). When no
// provider is configured, `provider` stays null and the AI layer uses the
// system/env models as normal.
export type AiProvider = {
  orgId: string;
  baseUrl: string;   // OpenAI-compatible or Anthropic base URL (protocol auto-detected)
  apiKey: string;
  model: string;
  lowModel?: string; // optional fast model; falls back to `model`
};

type Ctx = { provider: AiProvider | null; attempted: boolean };
const store = new AsyncLocalStorage<Ctx>();

// Set (or clear) the provider for the rest of this request; also marks resolution
// as attempted so the lazy resolver doesn't run again.
export function setAiProvider(p: AiProvider | null): void {
  const c = store.getStore();
  if (c) { c.provider = p; c.attempted = true; }
  else { try { store.enterWith({ provider: p, attempted: true }); } catch { /* runtime without ALS.enterWith */ } }
}

export function currentAiProvider(): AiProvider | null {
  return store.getStore()?.provider ?? null;
}

// Whether we've already tried to resolve an org provider this request (so a
// request whose org has no provider doesn't re-resolve on every AI call).
export function providerAttempted(): boolean {
  return store.getStore()?.attempted ?? false;
}
