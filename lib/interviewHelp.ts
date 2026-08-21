// Scaffolding for the blank-page moment in an interview module. Each entry gives
// a stuck person a few tappable STARTERS (opening phrases they can complete) and
// one line on WHY the module asks what it asks (its method), surfaced right at
// the input. Keyed by a stable per-room key (not always the module slug). Any
// unknown key falls back to a generic set, so every interview gets something.
export type InterviewHelp = { why: string; starters: string[] };

const NOT_SURE = "I'm not sure. Can you give an example?";

const HELP: Record<string, InterviewHelp> = {
  job: {
    why: "The questions ladder from your day-to-day tasks toward the value only you create, the qualitative-interview method behind the exercise.",
    starters: ["The task that eats most of my week is…", "The part of my job only I can really judge is…", NOT_SURE],
  },
  workflow: {
    why: "We walk the workflow step by step to find where a person, AI, or both should own each part.",
    starters: ["The workflow I want to redesign is…", "The step that slows everything down is…", NOT_SURE],
  },
  consult: {
    why: "We ladder from what you sell toward where the money is really made, then look for the one constraint holding things back.",
    starters: ["What we sell is…", "Our best customers come to us for…", "The thing that limits us right now is…"],
  },
  superpower: {
    why: "We draw out concrete stories first, then find the through-line, the thing you do better than most without trying.",
    starters: ["A time I was completely in flow was…", "People keep coming to me for…", "A moment I'm quietly proud of was…"],
  },
  "personal-network": {
    why: "We explore who you actually turn to and why, to map the real structure of your network: the weak ties and the brokers.",
    starters: ["The person I go to for honest advice is…", "Someone who connects me to a different world is…", "Lately I've been leaning on…"],
  },
  "myopia-business": {
    why: "We surface what past success quietly taught you to stop noticing, the roots of competency traps and marketing myopia.",
    starters: ["What's worked really well for us is…", "A kind of customer we don't serve is…", "Something we've always assumed is…"],
  },
  "myopia-career": {
    why: "We surface how the skills that made you successful might now be narrowing what you notice.",
    starters: ["What I'm known for is…", "The kind of work I keep saying no to is…", "Something I've long assumed about my path is…"],
  },
  vision: {
    why: "We reach past the tagline toward the core purpose and the future you're really building toward (Collins & Porras).",
    starters: ["What first made me want to build this was…", "If it vanished, what the world would lose is…", "In ten years I want people to say…"],
  },
  resume: {
    why: "We draw out concrete wins in results-first form: what actually changed because you were there.",
    starters: ["A win I'm proud of this year was…", "Something I shipped or fixed was…", "A number that moved because of me was…"],
  },
  "career-roadmap": {
    why: "We map your skills and what energizes you to find realistic next moves, lateral, step-up, and stretch.",
    starters: ["The work I want more of is…", "A role I'm curious about is…", "The skills I most want to build are…"],
  },
  empathy: {
    why: "There are no wrong answers, we're just trying to understand your world in your own words.",
    starters: ["Honestly, the most frustrating part is…", "The last time I dealt with this was…", "What I really wish existed is…"],
  },
  "good-business": {
    why: "We pressure-test the idea against real frameworks and unit economics, so specifics beat polish.",
    starters: ["The business idea is…", "Who would pay for this is…", NOT_SURE],
  },
};

const GENERIC: InterviewHelp = {
  why: "Each question builds on your last answer, so a concrete specific helps more than perfect wording.",
  starters: ["The situation I'm working through is…", "What I'm trying to figure out is…", NOT_SURE],
};

export function interviewHelp(key: string | undefined): InterviewHelp {
  return (key && HELP[key]) || GENERIC;
}
