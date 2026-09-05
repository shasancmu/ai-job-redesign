// The "Case Genome" — the reusable spec every living case is authored or
// generated into, and that the LivingCaseReader renders. Plain data (no JSX), so
// it can live in a file, come back from an AI generator, or be stored in a DB.

export type CaseVideo = { youtubeId: string; title: string };
export type CaseSource = { label: string; href: string };
export type CaseDeeper = { label: string; body: string }; // body is light markdown
export type CaseExhibitPoint = { x: number; y: number; label: string; note: string };
export type CaseExhibit = { title: string; caption?: string; points: CaseExhibitPoint[] };

// Light markdown supported in `body` fields: [label](https://url), *italic*, **bold**.
export type CaseBeat = {
  n: string;
  kicker: string;
  title: string;
  body: string;
  video?: CaseVideo;
  deeper?: CaseDeeper[];
  exhibit?: CaseExhibit;
  teach?: string; // instructor-only note, shown when Teaching notes is on
};

export type CaseCommitOption = { k: string; label: string; blurb: string };

export type CaseGenome = {
  slug: string;
  eyebrow: string; // "Strategy · platform bets · timing"
  title: string;
  dek: string; // hero paragraph (markdown)
  protagonist: string; // "Jensen Huang, CEO"
  decision: string; // "fund CUDA, or don't"
  meta: string; // "~10 min · 8 sources · 3 videos"
  openingVideo?: CaseVideo;
  heroImage?: { url: string; alt?: string }; // a verified image the editor attaches
  situationBeats: CaseBeat[]; // before the commit gate
  commitPrompt: string; // "It's 2006. You're Jensen. What do you do?"
  commitOptions: CaseCommitOption[];
  revealBeats: CaseBeat[]; // after the reader commits
  interrogate?: { q: string; a: string }[]; // interrogation teaser
  sources: CaseSource[];
  teachingIntro?: string; // teaching note in the hero
  generated?: boolean; // true if AI-drafted (shows the "verify before publish" banner)
};
