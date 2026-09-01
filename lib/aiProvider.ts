import { AsyncLocalStorage } from "async_hooks";

// A per-request AI provider override. An org (e.g. a university with FERPA
// obligations) can point the platform at its OWN self-hosted models + key, so
// student data never reaches the shared/public model. A route resolves the
// acting org's provider and sets it once (enterWith, request-scoped); the AI
// layer (lib/ai.ts runCompletion) then routes every non-vision text call to it
// EXCLUSIVELY — no fallback to the platform model (fail-closed by design).
export type AiProvider = {
  orgId: string;
  baseUrl: string;   // OpenAI-compatible or Anthropic base URL (protocol auto-detected)
  apiKey: string;
  model: string;
  lowModel?: string; // optional fast model; falls back to `model`
};

const store = new AsyncLocalStorage<AiProvider | null>();

export function setAiProvider(p: AiProvider | null): void {
  try { store.enterWith(p); } catch { /* runtime without ALS.enterWith */ }
}

export function currentAiProvider(): AiProvider | null {
  return store.getStore() ?? null;
}
