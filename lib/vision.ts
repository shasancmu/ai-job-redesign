// A vision exercise grounded in the framework of Jim Collins and Jerry Porras,
// which separates an organization's enduring core (what it stands for and exists
// to do) from its envisioned future (what it aspires to become). All copy here
// is original; the framework is credited, not reproduced.

export type VisionReport = {
  oneLiner?: string;
  coreValues: { value: string; meaning: string }[];
  corePurpose: string;
  bhag: string; // a bold long-term goal
  vividDescription: string;
  howToUse?: string;
};

export const VISION_INTRO =
  "A guided conversation to shape a lasting vision for your organization — what it stands for, why it exists, and where it's headed. Grounded in the vision framework of Collins and Porras.";
