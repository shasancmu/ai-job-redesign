// The authorable module formats — derived from the canonical registry in
// `lib/moduleKinds.ts`. Add a format THERE (and its editor in AutoBuild) and
// every count and picker that references it updates automatically. This file
// keeps the historical AuthorFormat shape so its consumers don't change.
// Server-safe (no client imports), so marketing pages can read the count.
import { MODULE_KINDS } from "@/lib/moduleKinds";

export type AuthorFormat = { id: string; label: string; emoji: string; endpoint: string; table?: string; editBase: string };

export const AUTHOR_FORMATS: AuthorFormat[] = MODULE_KINDS
  .filter((k) => k.authorable)
  .map((k) => ({ id: k.id, label: k.label, emoji: k.emoji, endpoint: k.copilotEndpoint || "", table: k.specTable, editBase: k.editBase }));

export const AUTHOR_FORMAT_COUNT = AUTHOR_FORMATS.length;
