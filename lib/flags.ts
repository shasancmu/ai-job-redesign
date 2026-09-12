// Feature flags.
//
// Static UI-chrome translation (the app's buttons/labels via messages/*.json).
// Turned OFF — those machine translations were low-value, so the platform chrome
// renders in English. Flip to true to bring it back.
export const I18N_ENABLED = false;

// AI-CONTENT localization: the substance of a module — the AI interview, the
// report, the tutor — is GENERATED in the learner's language on demand (no stored
// translation). Decoupled from I18N_ENABLED on purpose: this is the high-value half
// (module content in the learner's language) while the platform controls stay in
// English. Gates getUserLanguage, the account LanguagePicker, and the cohort
// language selector. Set the learner's language on their profile (the picker) or a
// cohort's language (which stamps members on join).
export const AI_LANG_ENABLED = true;
