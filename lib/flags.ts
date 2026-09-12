// Feature flags.
//
// Static UI-chrome translation (the app's buttons/labels via messages/*.json).
// Turned OFF — those machine translations were low-value, so the platform chrome
// renders in English. Flip to true to bring it back.
export const I18N_ENABLED = false;

// Localize the whole learner experience to their chosen language. Two halves, both
// driven by the learner's profile language (set via the account LanguagePicker or a
// cohort's language, which stamps members on join):
//   - AI content: the interview, report, and tutor are GENERATED in the language on
//     demand (getUserLanguage + withLanguage). No stored translation.
//   - Static UI: buttons, step titles, and field labels (every tf() string) follow
//     the language via the pre-translated messages/*.json bundle — free at runtime.
// So a module reads end-to-end in the learner's language. English users are
// unaffected (their locale stays "en"). Separate from I18N_ENABLED, which only ever
// governed whether this whole thing was on.
export const AI_LANG_ENABLED = true;
