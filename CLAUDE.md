# Superadditive — repo conventions

## Localization is structural — every module reads in the learner's language

Language is a **setting**, not a copy. It's driven by the learner's `profiles.language`
(the account LanguagePicker, or a cohort's `classes.language` which stamps members on
join), gated by `AI_LANG_ENABLED` in `lib/flags.ts`. Three layers cover a module, and
**a new module must not regress this**:

1. **AI-generated content** (interview, report, tutor, grading): wrap the AI call in
   `withLanguage(await getUserLanguage(supabase, user.id), () => ...)` (`lib/lang.ts`).
   Every AI route already does this — a new AI route MUST too.

2. **Static app chrome + existing built-in module cards/labels**: the pre-translated
   `messages/*.json` bundle, shown because `getServerLocale` follows the learner's
   language. Use `tf()` / `useT()` for chrome strings. Regenerating the bundle needs a
   VALID `AI_API_KEY` (+ matching `AI_BASE_URL`) — otherwise `scripts/build-messages.mjs`
   silently writes English over good translations. Prefer the cache below over trusting
   the local generator.

3. **Everything else — a module's own authored/static text** (custom-module specs, new
   built-in labels, paper-explainer/living-case content): the **runtime translation
   cache** (`lib/translationCache.ts` + `sql/translations.sql`). Each phrase is
   translated once per language then reused free. This is the mechanism that makes
   translation "built in" for any module.

### When you ADD a module (built-in OR custom super_type), do this one thing:

At the module's **run render** (the server component that loads its spec/def and passes
it to the client room), localize the client-safe display data before rendering:

```ts
import { localizeForViewer } from "@/lib/translationCache";
// ...
return <SomeRunner spec={await localizeForViewer(publicSpec(spec), supabase, user?.id)} />;
```

`localizeForViewer` is a no-op for English/signed-out; otherwise it deep-translates the
display strings (whitelisted text keys) via the cache, leaving ids/structure/answers
intact. Type-specific localizers exist for the common shapes: `localizeCanvasDef`
(report/interview canvas — wired in `app/room/[code]/page.tsx`), `localizePaperx`
(`/px`), `localizeByKeys` (living case `/cases`, and the generic fallback). Already wired:
`/m /n /x /nf /b /e`, canvas room, `/px`, `/cases`, and the catalog cards (dashboard
fills bundle-misses from the cache via the `tr` prop). If you add a new run route, add
the one line. Do NOT localize inside the spec *loaders* (`getSpec`, `resolveCanvasDefForUser`) —
the Studio EDITOR uses those and must show the author their original English.

Requires `sql/translations.sql` applied in Supabase; until then the cache no-ops
(English fallback), so nothing breaks.

## Other load-bearing facts
- Never import a runtime value from a `"use client"` module into a server component
  (opaque client-ref crash); keep shared values in a plain lib. Use `import type` for types.
- Migrations: written as `sql/*.sql` here; the USER applies them in Supabase. Code must
  degrade gracefully when a new column/table isn't migrated yet.
- Attribution lines for commits/PRs come from the session's system-reminder.
