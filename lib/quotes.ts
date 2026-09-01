// A small, curated set for the presence panel — chosen to fit a research / strategy /
// learning audience: substantive, a little wry, never a motivational poster. Reliable
// (no external API), quality-controlled, and rotated. The first is on the nose for us.
export type Quote = { text: string; author: string };

export const QUOTES: Quote[] = [
  { text: "The whole is greater than the sum of its parts.", author: "Aristotle" },
  { text: "The first principle is that you must not fool yourself — and you are the easiest person to fool.", author: "Richard Feynman" },
  { text: "If I have seen further, it is by standing on the shoulders of giants.", author: "Isaac Newton" },
  { text: "The important thing is not to stop questioning.", author: "Albert Einstein" },
  { text: "Somewhere, something incredible is waiting to be known.", author: "Carl Sagan" },
  { text: "The essence of strategy is choosing what not to do.", author: "Michael Porter" },
  { text: "It is a capital mistake to theorize before one has data.", author: "Arthur Conan Doyle" },
  { text: "Chance favors the prepared mind.", author: "Louis Pasteur" },
  { text: "An expert is a person who has made all the mistakes that can be made in a very narrow field.", author: "Niels Bohr" },
  { text: "The scientist is not a person who gives the right answers; they ask the right questions.", author: "Claude Lévi-Strauss" },
  { text: "Doubt is not a pleasant condition, but certainty is absurd.", author: "Voltaire" },
  { text: "Plans are worthless, but planning is everything.", author: "Dwight D. Eisenhower" },
  { text: "Research is what I'm doing when I don't know what I'm doing.", author: "Wernher von Braun" },
  { text: "Wonder is the beginning of wisdom.", author: "Socrates" },
  { text: "Learning never exhausts the mind.", author: "Leonardo da Vinci" },
  { text: "A good decision is based on knowledge, not on numbers.", author: "Plato" },
  { text: "The greatest enemy of knowledge is not ignorance, it is the illusion of knowledge.", author: "Daniel J. Boorstin" },
  { text: "What we observe is not nature itself, but nature exposed to our method of questioning.", author: "Werner Heisenberg" },
  { text: "Everything should be made as simple as possible, but not simpler.", author: "Albert Einstein" },
  { text: "The cure for boredom is curiosity. There is no cure for curiosity.", author: "Dorothy Parker" },
];

export function pickQuote(): Quote {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)] ?? QUOTES[0];
}
