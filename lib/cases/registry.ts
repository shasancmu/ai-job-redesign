import type { CaseGenome } from "./types";
import { NVIDIA_CUDA } from "./nvidia-cuda";

// Built-in, hand-authored living cases. Generated cases (from /cases/new) render
// from a genome held in the client or, later, loaded from a store.
const BUILTINS: Record<string, CaseGenome> = {
  [NVIDIA_CUDA.slug]: NVIDIA_CUDA,
};

export function caseBySlug(slug: string): CaseGenome | null {
  return BUILTINS[slug] || null;
}

export function allCases(): CaseGenome[] {
  return Object.values(BUILTINS);
}
