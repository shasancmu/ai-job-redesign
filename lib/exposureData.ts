// Occupation AI-exposure table — SOC (6-digit) → exposure % (0–100).
//
// GENERATED, not hand-entered. Produce it yourself from PUBLIC data:
//   1. Download O*NET "Task Statements" (CC BY) from onetcenter.org/database.html
//   2. node scripts/build-exposure.mjs <path-to-Task Statements.txt>
// The script applies the Eloundou et al. (2023) E0/E1/E2 rubric to each real
// O*NET task via your configured LLM and aggregates β = (E1 + 0.5·E2)/all to a %.
// Nothing here is copied from a third-party dataset — it's the published method
// re-run over public O*NET tasks, so the numbers are yours and fully citable.
//
// Empty until you generate it; occupationExposure() then falls back to a
// clearly-labeled rubric estimate.
export const EXPOSURE_DATA: Record<string, number> = {};

export const EXPOSURE_SOURCE = "O*NET Task Statements (CC BY) × Eloundou et al. (2023) rubric, self-generated";
