// AI Skills Lab — shared types for the three teaching simulators (prompting,
// agentic, vibe-coding). One engine, three "kinds"; a sim is a sequence of
// challenges, each run against a REAL model in a controlled setting, graded by a
// rubric, and iterated. Every sim ends with conceptual understanding (a debrief)
// AND a takeaway kit the learner can apply immediately on real tools.

export type SimKind = "prompt" | "agent" | "vibe";

export type Criterion = { key: string; label: string; weight: number; help: string };

// A mock tool an agent can call (agentic sim only). Behavior is a canned/randomized
// function server-side, so nothing real is touched and failures can be injected.
export type MockTool = {
  name: string;
  description: string;           // what the agent is TOLD it does (tool descriptions shape behavior)
  destructive?: boolean;         // requires human approval; taking it unprompted is a safety failure
  lies?: boolean;                // returns plausible-but-wrong data (teaches observation/recovery)
  fails?: boolean;               // errors, to teach recovery
};

export type Challenge = {
  id: string;
  title: string;
  brief: string;                 // the stakeholder brief / task framing (fuzzy on purpose)
  concept: string;               // the one idea this challenge teaches
  rubric: Criterion[];
  passScore: number;             // competence threshold to advance (0-100)
  // prompt sim:
  target?: string;               // description of the desired output the learner is steering toward
  starter?: string;              // a weak starter prompt to improve (optional)
  // agent sim:
  goal?: string;                 // the agent's goal
  tools?: MockTool[];            // the sandbox tools available
  trap?: string;                 // what makes this scenario hard (a lying tool, an approval gate, an impossible goal)
  // vibe sim:
  spec_fields?: { key: string; label: string; hint: string }[]; // the spec the learner must fill before prompting
  build_target?: string;         // what a good build looks like
};

export type SimDef = {
  kind: SimKind;
  slug: string;                  // module slug + route segment (/lab/<slug>)
  exercise: string;              // spine module key (e.g. "lab:prompt")
  name: string;
  tagline: string;
  intro: string;                 // what the learner will practice + why it transfers
  concepts: string[];            // the conceptual-understanding checklist (the debrief spine)
  challenges: Challenge[];
  takeaway: { title: string; body: string; template: string }; // the reusable kit they keep
  transfer: string;              // how this maps to the real tools they'll use (the transfer bridge)
};

// A grade returned by the judge for one attempt.
export type CriterionResult = { key: string; label: string; met: boolean; note: string };
export type Grade = {
  score: number;                 // 0-100 competence for this attempt
  criteria: CriterionResult[];
  hiddenAssumptions?: string[];  // what the AI assumed that the learner didn't specify (the intent/instruction gap)
  safety?: string | null;        // agent sim: a flagged unsafe/destructive action, or null
  strength: string;              // what worked
  gap: string;                   // the single most valuable thing to fix next
  passed: boolean;
};

// The artifact a run produces, by kind.
export type PromptArtifact = { kind: "prompt"; output: string };
export type AgentStep = { type: "plan" | "tool" | "observation" | "ask" | "finish"; tool?: string; input?: string; result?: string; text?: string; approved?: boolean };
export type AgentArtifact = { kind: "agent"; trace: AgentStep[]; steps: number; toolCalls: number; askedForHelp: boolean };
export type VibeArtifact = { kind: "vibe"; html: string; assumptions: string[]; notes: string };
export type Artifact = PromptArtifact | AgentArtifact | VibeArtifact;

export type RunResult = { artifact: Artifact; grade: Grade };
