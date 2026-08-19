// Shared browser-TTS voice selection. Most devices ship high-quality neural
// voices; the trick is picking one instead of the robotic default. Used by every
// voice-interview module so voice quality is fixed in one place.

export const TOP_TIER = /(enhanced|premium|neural|natural|siri)/i;
const GOOD_NAME = /(enhanced|premium|neural|natural|siri|ava|zoe|serena|samantha|allison|nicky|evan|nathan|jenny|aria|guy|sonia|libby|ryan|google us english|google uk english female)/i;
const BAD_NAME = /(compact|eloquence|espeak|zira|david|mark|hazel|novelty|whisper|bells|bad news|good news|bubbles|deranged|hysterical|trinoids|albert|junior|ralph|fred|organ|cellos|zarvox|wobble|boing|superstar|bahh|jester|rocko|shelley|grandma|grandpa|reed|flo|sandy|rishi)/i;

export function scoreVoice(v: SpeechSynthesisVoice): number {
  let s = 0;
  const lang = (v.lang || "").toLowerCase();
  if (lang.startsWith("en-us")) s += 3;
  else if (lang.startsWith("en-gb") || lang.startsWith("en-au")) s += 2;
  else if (lang.startsWith("en")) s += 1;
  if (TOP_TIER.test(v.name)) s += 6;
  else if (GOOD_NAME.test(v.name)) s += 4;
  if (v.localService === false) s += 1; // online neural voices usually sound better
  if (BAD_NAME.test(v.name)) s -= 8;
  return s;
}

export function englishVoices(list: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  const en = list.filter((v) => (v.lang || "").toLowerCase().startsWith("en"));
  return (en.length ? en : list).slice().sort((a, b) => scoreVoice(b) - scoreVoice(a));
}

export function pickBestVoice(list: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  return englishVoices(list)[0] || null;
}
