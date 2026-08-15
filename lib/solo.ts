// Steps for the "Solo with AI" exercise — self-paced, no partner.
export type SoloStep = {
  key: string;
  index: number;
  title: string;
  subtitle: string;
  minutes: number;
};

export const SOLO_STEPS: SoloStep[] = [
  {
    key: "setup",
    index: 0,
    title: "Your job today",
    subtitle: "Name your job and describe it in a line. Your AI partner will interview you about it.",
    minutes: 2,
  },
  {
    key: "interview",
    index: 1,
    title: "Talk to your AI partner",
    subtitle: "Answer its questions. It's trying to understand what only you can do — and what drains you.",
    minutes: 8,
  },
  {
    key: "redesign",
    index: 2,
    title: "Your reimagined job",
    subtitle: "Get an AI-drafted 2×4 split and new job description, then make it yours.",
    minutes: 6,
  },
  {
    key: "final",
    index: 3,
    title: "The reimagined job",
    subtitle: "Write the final version in one paragraph.",
    minutes: 2,
  },
];
