// ============================================================================
// Understand a Paper — a guided deconstruction that runs the four research
// frameworks (idea, hourglass, five points, interaction) against a real paper.
// A worked example / reading exercise. The seed paper is the authors' own
// "Experimentation and Startup Performance," so the default run is concrete.
// ============================================================================

export type PaperStudyStep = { key: string; title: string; minutes: number };
export const PAPER_STUDY_STEPS: PaperStudyStep[] = [
  { key: "setup", title: "The paper", minutes: 4 },
  { key: "study", title: "The deconstruction", minutes: 12 },
];

export const EXAMPLE_PAPER = {
  title: "Experimentation and Startup Performance: Evidence from A/B Testing",
  cite: "Koning, Hasan & Chatterji, Management Science",
  text: `Title: Experimentation and Startup Performance: Evidence from A/B Testing (Rembrand Koning, Sharique Hasan, Aaron Chatterji).

Abstract: Recent work argues that experimentation is the appropriate framework for entrepreneurial strategy. We investigate this proposition by exploiting the time-varying adoption of A/B testing technology, which has drastically reduced the cost of experimentally testing business ideas. This paper provides the first evidence of how digital experimentation affects the performance of a large sample of high-technology startups using data that tracks their growth, technology use, and product launches. We find that, despite its prominence in the business press, relatively few firms have adopted A/B testing. However, among those that do, we find increased performance on several critical dimensions, including page views and new product features. Furthermore, A/B testing is positively related to tail outcomes, with younger ventures failing faster and older firms being more likely to scale. Firms with experienced managers also derive more benefits from A/B testing. Our results inform the emerging literature on entrepreneurial strategy and how digitization and data-driven decision-making are shaping strategy.

Opening question: "Why do so few startups succeed?"

Stated contribution: large-scale empirical support that a flexible, experimental approach to strategy can lead to persistent performance improvements, but that firms must also have the capability to profit from experimentation. A strategy based on experimentation requires more than just a reduction in the cost of testing ideas.`,
};
