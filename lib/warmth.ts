// Warm, understated micro-copy for loading and empty states — dry and human, never
// cheesy. Pick one at random on the client. Spread these into loading/empty spots
// as you touch them; the point is a consistent, quietly human voice.
export const WARM_LOADING = [
  "Reading it back…",
  "Thinking this through…",
  "Getting it right…",
  "Looking closely…",
  "One moment — worth doing properly…",
];

export const WARM_EMPTY = [
  "Nothing here yet — a good place to start.",
  "Empty for now. It fills as you go.",
];

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] ?? arr[0];
}
