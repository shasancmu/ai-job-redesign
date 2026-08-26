// Presentation slide model, shared by the builder (client) and the server. No
// server imports here so the client can use the types + palette freely.

export type SlideBase = { id: string };
export type Slide =
  | (SlideBase & { type: "title"; title: string; subtitle?: string })
  | (SlideBase & { type: "section"; title: string })
  | (SlideBase & { type: "bullets"; title: string; bullets: string[] })
  | (SlideBase & { type: "text"; title?: string; body: string })
  | (SlideBase & { type: "quote"; quote: string; attribution?: string })
  | (SlideBase & { type: "image"; url: string; caption?: string })
  | (SlideBase & { type: "cards"; title?: string; cards: DeckCard[] }) // a grid of tiles
  | (SlideBase & { type: "cloud"; question: string; code?: string }) // live word cloud
  | (SlideBase & { type: "photo"; prompt: string; code?: string }) // live room photo + AI
  | (SlideBase & { type: "quiz"; title?: string; timeLimitSec?: number; questions: QuizQ[]; code?: string }) // live quiz vs the room
  | (SlideBase & { type: "network"; title?: string; subtitle?: string; nodes: NetNode[]; edges: NetEdge[] }) // a relationship graph (e.g. who paired with whom)
  | (SlideBase & { type: "barlist"; title?: string; subtitle?: string; bars: DeckBar[] }); // ranked horizontal bars

export type QuizQ = { prompt: string; options: string[]; answer: number };
export type DeckCard = { icon?: string; heading: string; text?: string };
export type NetNode = { id: string; label: string; group?: number };
export type NetEdge = { a: string; b: string };
export type DeckBar = { label: string; value: number; hint?: string; group?: number };

export type SlideType = Slide["type"];
export type Deck = { slug: string; title: string; slides: Slide[]; org_id: string | null; status: string; author_id?: string };

export const STATIC_TYPES: { type: SlideType; label: string; icon: string }[] = [
  { type: "title", label: "Title", icon: "🏷️" },
  { type: "section", label: "Section", icon: "▮" },
  { type: "bullets", label: "Bullets", icon: "•" },
  { type: "text", label: "Text", icon: "¶" },
  { type: "quote", label: "Quote", icon: "❝" },
  { type: "image", label: "Image", icon: "🖼️" },
  { type: "cards", label: "Cards", icon: "▦" },
];
export const ACTIVITY_TYPES: { type: SlideType; label: string; icon: string; blurb: string }[] = [
  { type: "cloud", label: "Live word cloud", icon: "☁️", blurb: "The room submits phrases; they appear live with an AI summary." },
  { type: "photo", label: "Room photo + AI", icon: "📷", blurb: "The room adds a photo; AI reacts on the slide." },
  { type: "quiz", label: "Live quiz", icon: "🧠", blurb: "The room answers your questions, scored live against the room." },
];
export const ACTIVITY_TYPE_SET = new Set<SlideType>(["cloud", "photo", "quiz"]);

// The present-route each activity slide embeds (host-only; the author is host).
export function activityPresentPath(slide: Slide): string | null {
  if (slide.type === "cloud" && slide.code) return `/cloud/${slide.code}/present`;
  if (slide.type === "photo" && slide.code) return `/photo/${slide.code}/present`;
  if (slide.type === "quiz" && slide.code) return `/quiz/${slide.code}/present`;
  return null;
}

let counter = 0;
export function newSlide(type: SlideType): Slide {
  const id = `s${Date.now().toString(36)}${(counter++).toString(36)}`;
  switch (type) {
    case "title": return { id, type, title: "", subtitle: "" };
    case "section": return { id, type, title: "" };
    case "bullets": return { id, type, title: "", bullets: ["", ""] };
    case "text": return { id, type, title: "", body: "" };
    case "quote": return { id, type, quote: "", attribution: "" };
    case "image": return { id, type, url: "", caption: "" };
    case "cloud": return { id, type, question: "" };
    case "photo": return { id, type, prompt: "" };
    case "quiz": return { id, type, title: "", timeLimitSec: 180, questions: [{ prompt: "", options: ["", ""], answer: 0 }] };
    case "cards": return { id, type, title: "", cards: [{ icon: "✨", heading: "", text: "" }, { icon: "🎯", heading: "", text: "" }] };
  }
}

export function slugify(s: string): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "deck";
}

export function slideLabel(s: Slide): string {
  if ("title" in s && s.title) return s.title;
  if (s.type === "quote") return s.quote || "Quote";
  if (s.type === "cloud") return s.question || "Word cloud";
  if (s.type === "photo") return s.prompt || "Room photo";
  if (s.type === "quiz") return s.title || "Quiz";
  if (s.type === "text") return s.body?.slice(0, 40) || "Text";
  if (s.type === "image") return s.caption || "Image";
  if (s.type === "cards") return `${s.cards?.length || 0} cards`;
  if (s.type === "network") return s.title || "Network";
  if (s.type === "barlist") return s.title || "Ranking";
  return s.type;
}

export function validateDeck(title: string, slides: Slide[]): string[] {
  const errs: string[] = [];
  if ((title || "").trim().length < 2) errs.push("Give the deck a title.");
  if (!slides.length) errs.push("Add at least one slide.");
  slides.forEach((s, i) => {
    const n = i + 1;
    if (s.type === "cloud" && !(s.question || "").trim()) errs.push(`Slide ${n}: add a word-cloud question.`);
    if (s.type === "photo" && !(s.prompt || "").trim()) errs.push(`Slide ${n}: add a photo prompt.`);
    if (s.type === "image" && !(s.url || "").trim()) errs.push(`Slide ${n}: add an image.`);
    if (s.type === "quiz") {
      const qs = (s.questions || []).filter((q) => (q.prompt || "").trim() && (q.options || []).filter((o) => o.trim()).length >= 2);
      if (qs.length < 1) errs.push(`Slide ${n}: add at least one quiz question with a prompt and two options.`);
    }
  });
  return errs;
}
