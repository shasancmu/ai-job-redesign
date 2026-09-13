import { currentAiProvider, providerAttempted } from "@/lib/aiProvider";
import { currentFlow } from "@/lib/aiflow";
import { currentLanguage } from "@/lib/lang";
import { resolveRequestAiProvider } from "@/lib/orgAi";
import { createAdminClient } from "@/lib/supabase/admin";

// ============================================================================
// AI interviewer, talks to any OpenAI-compatible chat API.
// Defaults to Groq (free tier, Llama 3.3 70B). Swap providers with env vars:
//   AI_API_KEY   (required to turn the feature on)
//   AI_BASE_URL  default https://api.groq.com/openai/v1
//   AI_MODEL     default llama-3.3-70b-versatile
// Works as-is with Groq, OpenAI, OpenRouter, Together, and Gemini's
// OpenAI-compatible endpoint, only the three vars change.
//
// VISION (Photo Wall) uses its own optional config so image analysis can run on
// a vision-capable model without changing the text model. Each falls back to the
// matching text var when unset:
//   AI_VISION_API_KEY   (falls back to AI_API_KEY)
//   AI_VISION_BASE_URL  (falls back to AI_BASE_URL)
//   AI_VISION_MODEL     (falls back to AI_MODEL) — MUST be vision-capable
// ============================================================================

export const AI_ENABLED = !!process.env.AI_API_KEY;

const BASE_URL = process.env.AI_BASE_URL || "https://api.groq.com/openai/v1";
export const MODEL = process.env.AI_MODEL || "llama-3.3-70b-versatile";
// Optional faster/cheaper "low" model for short, structured generations where
// latency matters more than depth (e.g. the implementation plan). It gets its own
// model, key, and (optionally) base URL, so it can be a different provider or a
// rate-isolated key. Any unset piece falls back to the main model's config, so
// setting only AI_MODEL_LOW (e.g. claude-haiku-4-5-20251001) is enough.
//   AI_MODEL_LOW           model id (falls back to AI_MODEL)
//   AI_MODEL_LOW_API_KEY   its key (falls back to AI_API_KEY)
//   AI_MODEL_LOW_BASE_URL  its endpoint (falls back to AI_BASE_URL)
const LOW_MODEL = process.env.AI_MODEL_LOW || MODEL;
const LOW_BASE_URL = process.env.AI_MODEL_LOW_BASE_URL || BASE_URL;
const LOW_API_KEY = process.env.AI_MODEL_LOW_API_KEY || process.env.AI_API_KEY || "";

const VISION_BASE_URL = process.env.AI_VISION_BASE_URL || BASE_URL;
const VISION_MODEL = process.env.AI_VISION_MODEL || MODEL;
const VISION_API_KEY = process.env.AI_VISION_API_KEY || process.env.AI_API_KEY || "";
export const VISION_ENABLED = !!VISION_API_KEY;

export type ChatMsg = { role: "system" | "user" | "assistant"; content: string };


// Anthropic's OpenAI-compatible endpoint requires max_tokens and doesn't take
// response_format, so we set the first and only send the second elsewhere.
const IS_ANTHROPIC = BASE_URL.includes("anthropic.com");

// A house style rule injected into EVERY AI call: no em-dashes. Most of the
// user-visible copy is model-generated at runtime, so this is where the ban has
// to live to actually hold.
const STYLE_RULE =
  `\n\nSTYLE: Never use em-dashes (the "—" character) in your writing. Use commas, colons, parentheses, or separate sentences instead. This applies to all human-readable text, including the string values inside any JSON you return.` +
  `\n\nVOICE: Sound like a real, present person, not a chatbot. Skip filler openers ("Great question", "Absolutely", "Sure", "I'd be happy to", "Thanks for sharing", "That's a great point") and never refer to yourself as an AI or language model. Be specific and concrete: build on the actual words, details, and examples the person just gave you instead of speaking in generalities, and make what you say or ask about THEIR particular situation, not a generic version of it. React briefly and genuinely to what they just said before you move on, without empty flattery. This applies whether you are interviewing, playing a character, or coaching.` +
  `\n\nWRITING: Cut the tells of machine writing. No padded triads (three parallel items where one sharp one would do). No "not just X, it's Y" or "isn't about X, it's about Y" constructions. No hype words (unlock, supercharge, seamless, robust, powerful, leverage, empower, elevate, dive in, journey, game-changing). No hedges (helps you, designed to, aims to, can assist with): say what actually happens, with a strong verb. Say a thing once, then move on; don't restate it in different words. Prefer a short true sentence to a long balanced one.`;

// Append per-request directives to the system prompt without changing any
// caller: always the style rule, plus a language directive when the request is
// scoped to a non-English language, so ALL AI output localizes.
function localize(messages: ChatMsg[]): ChatMsg[] {
  const lang = currentLanguage();
  const langDirective = lang
    ? `\n\nIMPORTANT: Write ALL of your output in ${lang}, using natural, native ${lang}. If your output is JSON, keep the JSON keys and any enum values (like "E0"/"E1"/"E2", "substitute"/"complement", "human"/"ai"/"both") EXACTLY as specified in English, translate only the human-readable text values and prose into ${lang}.`
    : "";
  const directive = STYLE_RULE + langDirective;
  const hasSystem = messages.some((m) => m.role === "system");
  return hasSystem
    ? messages.map((m) => (m.role === "system" ? { ...m, content: m.content + directive } : m))
    : [
        {
          role: "system",
          content: (lang ? `Respond entirely in ${lang}, using natural, native ${lang}.` : "You are a helpful assistant.") + STYLE_RULE,
        },
        ...messages,
      ];
}

// One POST with a hard timeout so a stalled provider can never hang forever.
// Heavy generations (a full module spec) can pass a longer timeoutMs, bounded by
// the calling route's maxDuration.
async function postJSON(url: string, headers: Record<string, string>, payload: any, timeoutMs = 55000): Promise<any> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload), signal: ctl.signal });
  } catch (e: any) {
    if (e?.name === "AbortError") throw new Error("AI request timed out. Try again.");
    throw e;
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AI request failed (${res.status}): ${text.slice(0, 300)}`);
  }
  return res.json();
}

// Streaming POST: reads a Server-Sent-Events body, pulls a text delta out of each
// event with `extractDelta`, forwards it to `onToken`, and returns the full
// accumulated string. Used when a caller wants tokens as they arrive (chat turns)
// rather than the whole reply at once. Longer timeout than postJSON since a
// streamed generation legitimately takes longer to finish than a single response.
async function postSSE(
  url: string,
  headers: Record<string, string>,
  payload: any,
  extractDelta: (evt: any) => string,
  onToken: (delta: string) => void,
  timeoutMs = 90000
): Promise<{ text: string; usage: AiUsage | null }> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers, body: JSON.stringify({ ...payload, stream: true }), signal: ctl.signal });
  } catch (e: any) {
    clearTimeout(timer);
    if (e?.name === "AbortError") throw new Error("AI request timed out. Try again.");
    throw e;
  }
  if (!res.ok || !res.body) {
    clearTimeout(timer);
    const text = await res.text().catch(() => "");
    throw new Error(`AI request failed (${res.status}): ${text.slice(0, 300)}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let full = "";
  let usage: AiUsage | null = null;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        let evt: any;
        try { evt = JSON.parse(data); } catch { continue; }
        const u = usageFromEvent(evt);
        if (u) usage = mergeUsage(usage, u);
        const delta = extractDelta(evt) || "";
        if (delta) { full += delta; try { onToken(delta); } catch { /* consumer gone */ } }
      }
    }
  } finally {
    clearTimeout(timer);
  }
  return { text: full, usage };
}

// ---- Usage / instrumentation ---------------------------------------------
// Real measured token usage + errors + latency per AI call, logged best-effort
// to the ai_events table so the admin cost/health page shows actual spend and
// failures (not just estimates). Never allowed to affect a user request.
type AiUsage = { input?: number; output?: number; cacheRead?: number; cacheWrite?: number };

// Map either provider's usage shape (Anthropic native or OpenAI-compatible) to
// our common fields.
function normalizeUsage(raw: any): AiUsage | null {
  if (!raw || typeof raw !== "object") return null;
  const u: AiUsage = {};
  if (raw.input_tokens != null) u.input = raw.input_tokens;           // Anthropic
  if (raw.output_tokens != null) u.output = raw.output_tokens;
  if (raw.cache_read_input_tokens != null) u.cacheRead = raw.cache_read_input_tokens;
  if (raw.cache_creation_input_tokens != null) u.cacheWrite = raw.cache_creation_input_tokens;
  if (raw.prompt_tokens != null) u.input = raw.prompt_tokens;         // OpenAI-compatible
  if (raw.completion_tokens != null) u.output = raw.completion_tokens;
  if (raw.prompt_tokens_details?.cached_tokens != null) u.cacheRead = raw.prompt_tokens_details.cached_tokens;
  return Object.keys(u).length ? u : null;
}

// Pull usage out of a single streamed event (Anthropic message_start / _delta,
// or an OpenAI-compatible final chunk carrying `usage`).
function usageFromEvent(evt: any): AiUsage | null {
  if (!evt || typeof evt !== "object") return null;
  if (evt.type === "message_start" && evt.message?.usage) return normalizeUsage(evt.message.usage);
  if (evt.type === "message_delta" && evt.usage) return normalizeUsage(evt.usage);
  if (evt.usage) return normalizeUsage(evt.usage);
  return null;
}

function mergeUsage(a: AiUsage | null, b: AiUsage | null): AiUsage | null {
  if (!a) return b;
  if (!b) return a;
  // Later values win (output_tokens in a stream is cumulative, not additive).
  return { ...a, ...b };
}

let _logClient: any = null;
let _logClientTried = false;
function logClient(): any {
  if (_logClientTried) return _logClient;
  _logClientTried = true;
  try { _logClient = createAdminClient(); } catch { _logClient = null; }
  return _logClient;
}

async function logAiEvent(e: { model: string; flow: string | null; ok: boolean; error: string | null; latencyMs: number; usage: AiUsage | null }): Promise<void> {
  try {
    const admin = logClient();
    if (!admin) return;
    await admin.from("ai_events").insert({
      model: e.model,
      flow: e.flow,
      ok: e.ok,
      error: e.error ? e.error.slice(0, 400) : null,
      latency_ms: e.latencyMs,
      input_tokens: e.usage?.input ?? null,
      output_tokens: e.usage?.output ?? null,
      cache_read_tokens: e.usage?.cacheRead ?? null,
      cache_write_tokens: e.usage?.cacheWrite ?? null,
    });
  } catch { /* logging must never break a request */ }
}

// Public wrapper: times the call, records the outcome (tokens/error/latency) to
// ai_events, and re-throws any error unchanged. The generation itself lives in
// runCompletion.
export async function complete(
  messages: ChatMsg[],
  opts: { json?: boolean; temperature?: number; maxTokens?: number; vision?: boolean; low?: boolean; onToken?: (delta: string) => void; flow?: string | null; timeoutMs?: number } = {}
): Promise<string> {
  const started = Date.now();
  // Mirror runCompletion's routing so the logged model matches what actually ran.
  const useLow = !opts.vision && (opts.low === true || (opts.low !== false && !opts.onToken));
  const model = opts.vision ? VISION_MODEL : useLow ? LOW_MODEL : MODEL;
  let error: string | null = null;
  let usage: AiUsage | null = null;
  try {
    const r = await runCompletion(messages, opts);
    usage = r.usage;
    let text = r.text;
    // JSON reliability, applied to EVERY json call: if the reply doesn't parse
    // (prose, a refusal, questions, a stray fence), retry ONCE at temperature 0
    // with a strict "JSON only, no questions" nudge. Never throws here, so each
    // caller's own extractJson + fallback still behaves as before, just with a
    // parseable reply far more often.
    if (opts.json && !opts.onToken && !isParseableJson(text)) {
      const retryMsgs: ChatMsg[] = [
        ...messages,
        { role: "system", content: "Your previous reply could not be parsed. Reply with ONLY a single valid JSON object: no prose, no questions, no markdown code fences." },
      ];
      // Cap the repair retry so a heavy call plus its retry can never exceed the
      // route's maxDuration (which would make Vercel return a non-JSON 504).
      const r2 = await runCompletion(retryMsgs, { ...opts, temperature: 0, timeoutMs: Math.min(opts.timeoutMs ?? 55000, 20000) });
      usage = r2.usage || usage;
      if ((r2.text || "").trim()) text = r2.text; // keep the retry's text (better parse, or a better error snippet)
    }
    return text;
  } catch (e: any) {
    error = String(e?.message || e);
    throw e;
  } finally {
    await logAiEvent({ model, flow: opts.flow ?? currentFlow(), ok: !error, error, latencyMs: Date.now() - started, usage });
  }
}

async function runCompletion(
  messages: ChatMsg[],
  opts: { json?: boolean; temperature?: number; maxTokens?: number; vision?: boolean; low?: boolean; onToken?: (delta: string) => void; flow?: string | null; timeoutMs?: number } = {}
): Promise<{ text: string; usage: AiUsage | null }> {
  // Model routing. Vision uses its own config. Otherwise the "low" (fast) model
  // is used for one-shot GENERATIONS (reports, analyses, drafts), while the main
  // model (Sonnet) is kept for STREAMED turns — the interviews and chat, where
  // conversational nuance matters. Rules: low:true forces low; low:false forces
  // the main model (for the few non-streamed conversational calls); otherwise the
  // default is low for non-streamed and main for streamed. When AI_MODEL_LOW is
  // unset, LOW_* equals the main config, so this whole thing is a no-op.
  const useLow = !opts.vision && (opts.low === true || (opts.low !== false && !opts.onToken));
  let baseUrl = (opts.vision ? VISION_BASE_URL : useLow ? LOW_BASE_URL : BASE_URL).replace(/\/$/, "");
  let model = opts.vision ? VISION_MODEL : useLow ? LOW_MODEL : MODEL;
  let apiKey = opts.vision ? VISION_API_KEY : useLow ? LOW_API_KEY : process.env.AI_API_KEY;
  // Per-org BYO provider (e.g. a university's own FERPA-compliant, self-hosted
  // endpoint): resolve the acting org's provider once per request (lazy, so every
  // AI route is covered with no per-route wiring). When one is active, ALL
  // non-vision text calls go to it EXCLUSIVELY — no fallback to the shared platform
  // model (fail-closed). When none is configured, the system/env models are used.
  if (!opts.vision && !providerAttempted()) {
    await resolveRequestAiProvider();
  }
  const orgProv = opts.vision ? null : currentAiProvider();
  if (orgProv) {
    baseUrl = orgProv.baseUrl.replace(/\/$/, "");
    apiKey = orgProv.apiKey;
    model = useLow ? (orgProv.lowModel || orgProv.model) : orgProv.model;
  }
  const isAnthropic = baseUrl.includes("anthropic.com");
  // Some vision/reasoning models reject `temperature` entirely, so on vision
  // calls we send only an explicitly-provided value and otherwise omit it.
  const temp = opts.vision ? opts.temperature : opts.temperature ?? 0.7;
  const localized = localize(messages);

  // On Anthropic, text calls go through the NATIVE Messages API so we can use
  // prompt caching (the OpenAI-compat layer strips it). Caching the stable
  // prefix (the interview system prompt + any pasted résumé/context, re-sent
  // every turn) is lossless, identical output, and cuts input cost sharply.
  // Any failure or empty result falls back to the proven compat path below, so
  // this can never break generation. Vision stays on the compat path (its image
  // blocks use the OpenAI image_url shape).
  if (isAnthropic && !opts.vision) {
    try {
      const sys = localized.filter((m) => m.role === "system").map((m) => m.content).join("\n");
      const convo: any[] = localized.filter((m) => m.role !== "system").map((m) => ({ role: m.role, content: m.content as any }));
      // Anthropic requires the first message to be `user`; our interviews open
      // with the assistant's question, so restore the implicit opening turn.
      if (convo.length && convo[0].role === "assistant") convo.unshift({ role: "user", content: "(Begin.)" });
      // Cache breakpoint on the last turn so the whole prior transcript is
      // read from cache on the next turn, plus one on the system prefix.
      if (convo.length) {
        const last = convo[convo.length - 1];
        last.content = [{ type: "text", text: String(last.content), cache_control: { type: "ephemeral" } }];
      }
      // For (non-streamed) JSON calls, prefill the assistant turn with "{" so the
      // model can only continue the object: no preamble sentence, no ```json fence.
      // That's the usual cause of an unparseable first reply and a costly second
      // generation, so this keeps JSON calls to a single, fast pass.
      const jsonPrefill = !!opts.json && !opts.onToken;
      if (jsonPrefill) convo.push({ role: "assistant", content: "{" });
      const payload: Record<string, any> = { model, max_tokens: opts.maxTokens ?? 4096, messages: convo };
      if (sys) payload.system = [{ type: "text", text: sys, cache_control: { type: "ephemeral" } }];
      // Omit temperature on a BYO org provider: some models (o-series/gpt-5/etc.)
      // reject any non-default temperature, so let the model use its own default.
      if (temp != null && !orgProv) payload.temperature = Math.min(Math.max(temp, 0), 1);
      const anthropicHeaders = {
        "Content-Type": "application/json",
        "x-api-key": apiKey || "",
        "anthropic-version": "2023-06-01",
      };
      if (opts.onToken) {
        const { text, usage } = await postSSE(`${baseUrl}/messages`, anthropicHeaders, payload,
          (evt) => (evt?.type === "content_block_delta" && evt?.delta?.type === "text_delta" ? evt.delta.text || "" : ""),
          opts.onToken, opts.timeoutMs);
        if (text && text.trim()) return { text, usage };
      } else {
        const data = await postJSON(`${baseUrl}/messages`, anthropicHeaders, payload, opts.timeoutMs);
        const out = (data?.content || []).filter((b: any) => b?.type === "text").map((b: any) => b.text).join("");
        if (out && out.trim()) {
          // Re-attach the prefilled "{" the model was told to continue from.
          const full = jsonPrefill && !out.trimStart().startsWith("{") ? "{" + out : out;
          return { text: full, usage: normalizeUsage(data?.usage) };
        }
      }
    } catch {
      /* fall through to the OpenAI-compatible path */
    }
  }

  const payload: Record<string, any> = {
    model,
    messages: localized,
    // Big enough that structured plans don't get truncated into invalid JSON.
    max_tokens: opts.maxTokens ?? 4096,
  };
  // Omit temperature on a BYO org provider (see note above): strict newer models
  // reject any non-default value, so let the endpoint apply its own default.
  if (temp != null && !orgProv) payload.temperature = temp;
  if (opts.json && !isAnthropic) payload.response_format = { type: "json_object" };
  const compatHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
  if (opts.onToken) {
    payload.stream_options = { include_usage: true }; // ask compat providers to report tokens on streams
    return postSSE(`${baseUrl}/chat/completions`, compatHeaders, payload,
      (evt) => evt?.choices?.[0]?.delta?.content || "",
      opts.onToken, opts.timeoutMs);
  }
  const data = await postJSON(`${baseUrl}/chat/completions`, compatHeaders, payload, opts.timeoutMs);
  return { text: data.choices?.[0]?.message?.content ?? "", usage: normalizeUsage(data?.usage) };
}

// Public streaming entry point for chat-turn callers that own their own message
// array (e.g. roleplay, where the API route builds the system prompt). Forwards
// each token to `onToken` as it arrives and resolves with the full reply. Falls
// back to a non-streamed completion automatically if the caller passes no
// callback, so it is always safe to use.
export async function streamReply(
  messages: ChatMsg[],
  opts: { temperature?: number; maxTokens?: number } = {},
  onToken?: (delta: string) => void
): Promise<string> {
  return complete(messages, { ...opts, onToken });
}

// Parse JSON from a model reply, tolerating markdown fences / surrounding prose.
// Different providers wrap JSON differently (Groq is clean; Claude often adds a
// preamble or a ```json fence, and prose can contain stray { } that a naive
// first-to-last slice would choke on), so we try several strategies in order.
export function extractJson(raw: string): any {
  const s = String(raw).trim();
  const candidates: string[] = [];
  // 1) as-is
  candidates.push(s);
  // 2) inside a ```json … ``` (or plain ```) fence
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) candidates.push(fence[1].trim());
  // 3) the first *balanced* {…} object, respecting quotes/escapes
  const balanced = firstBalancedObject(s);
  if (balanced) candidates.push(balanced);
  // 4) crude first-brace to last-brace fallback
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first >= 0 && last > first) candidates.push(s.slice(first, last + 1));

  // 5) truncation repair: a report cut off at max_tokens is mid-JSON. Trim to
  //    the last complete field and close open brackets to salvage the rest.
  const repaired = closeTruncated(balanced || (first >= 0 ? s.slice(first) : ""));
  if (repaired) candidates.push(repaired);

  // 6) sanitized variants: raw control chars (literal newlines/tabs) inside a
  //    string value are invalid JSON and a common model slip (e.g. a multi-line
  //    transcript). Collapsing them to spaces keeps the structure parseable.
  for (const c of [...candidates]) candidates.push(c.replace(/[\u0000-\u001F]+/g, " "));

  for (const c of candidates) {
    try {
      return JSON.parse(c);
    } catch {
      /* try the next strategy */
    }
  }
  // Descriptive failure so prod errors are diagnosable, not a dead end.
  const snippet = String(raw).replace(/\s+/g, " ").trim().slice(0, 160);
  throw new Error(snippet ? `The AI did not return usable JSON. It replied: "${snippet}…"` : "The AI returned an empty reply. Try again.");
}

// Cheap parseability check used by complete() to decide whether to retry a json
// call. (extractJson is a hoisted declaration, so it's in scope above.)
function isParseableJson(raw: string): boolean {
  try { extractJson(raw); return true; } catch { return false; }
}

// Get a JSON object back from the model. complete() already retries json calls
// that don't parse (see above), so this is just: get the reply, extract it.
export async function completeJson(
  messages: ChatMsg[],
  opts: { temperature?: number; maxTokens?: number; flow?: string | null; low?: boolean; timeoutMs?: number } = {},
): Promise<any> {
  return extractJson(await complete(messages, { ...opts, json: true }));
}
// The SOURCE MATERIAL block for the authoring copilots. `opinion` is the author's
// toggle: "low" = stay faithful to what they gave (their docs + interview answers),
// "high" = treat it as a starting point and add the AI's own design judgment.
export function sourceMaterialBlock(source: string | undefined | null, opinion: "low" | "high" = "low"): string {
  const s = String(source || "").trim();
  if (!s) return "";
  const head = opinion === "high"
    ? `\nSOURCE MATERIAL — the author's own uploaded documents and/or their interview answers. Build CLOSELY on it: keep its situation, facts, terminology, characters, numbers, and structure. You may lightly tidy wording, fill small gaps needed to make the module work, and add minimal connective detail — but change as little as possible and invent as little as possible. The author should see essentially their own material, only lightly polished. Do not drift to a nearby topic.`
    : `\nSOURCE MATERIAL — the author's own uploaded documents and/or their interview answers. This is the truth to build on, verbatim where you can. Stay STRICTLY FAITHFUL: use its actual situation, facts, terminology, characters, numbers, and specifics, and do not add, invent, generalize, or reinterpret. The author should recognize their material exactly. Do not drift to a nearby topic. Where a module type strictly needs a fictional name, change only the name and keep the substance.`;
  return `${head}\n${s.slice(0, 12000)}`;
}

// Close a JSON object cut off mid-stream (truncated at max_tokens): trim to the
// last complete field, drop a dangling comma, then close still-open brackets.
function closeTruncated(input: string): string | null {
  if (!input) return null;
  const start = input.indexOf("{");
  if (start < 0) return null;
  const str = input.slice(start);
  let inStr = false, esc = false, lastSafe = -1;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (inStr) { if (esc) esc = false; else if (ch === "\\") esc = true; else if (ch === '"') inStr = false; continue; }
    if (ch === '"') inStr = true;
    else if (ch === "," || ch === "}" || ch === "]") lastSafe = i;
  }
  if (lastSafe < 0) return null;
  let cut = str.slice(0, lastSafe + 1).replace(/,\s*$/, "");
  const stack: string[] = [];
  let s2 = false, e2 = false;
  for (const ch of cut) {
    if (s2) { if (e2) e2 = false; else if (ch === "\\") e2 = true; else if (ch === '"') s2 = false; continue; }
    if (ch === '"') s2 = true;
    else if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
  }
  for (let i = stack.length - 1; i >= 0; i--) cut += stack[i];
  return cut;
}

// Scan for the first top-level {…} object, tracking string literals so braces
// inside quoted text don't confuse the balance count.
function firstBalancedObject(s: string): string | null {
  const start = s.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

// The core qualitative-interviewing craft, distilled from Geiecke & Jaravel
// (2026), "Conversations at Scale," which encodes Small & Calarco's (2022) six
// principles. Kept as one shared block so every interview inherits the same
// validated method, with only the topic outline swapped per exercise.
export const INTERVIEW_CRAFT = `Follow established qualitative-interview craft (Small & Calarco, 2022):
- Be NON-DIRECTIVE and non-leading: let the respondent raise what matters. Never suggest a possible answer, not even a broad theme. Lead with follow-up questions to make each point they raise clear. Strong follow-ups include "Can you tell me more about the last time you did that?", "What has that been like for you?", "Why is this important to you?", and "Can you offer an example?", but the best one depends on the moment. If they can't answer, ask again from a different angle before moving on.
- Collect PALPABLE EVIDENCE: ask them to describe concrete events, situations, people, places, and practices, and pull specific details and examples. Avoid questions that only produce broad generalizations.
- Show COGNITIVE EMPATHY: ask why they hold a view, where it came from, and how it fits together, try to understand them as they understand themselves.
- Don't assume a particular view or provoke a defensive reaction; make clear that different views are welcome.
- Ask ONLY ONE question per message, and keep it short.
- Stay on the interview's purpose; if the conversation drifts, gently steer it back.
- MOMENTUM: get the ONE telling detail, then move on. Do not keep drilling the same point past the moment it becomes useful, and do not chase minutia for its own sake. Each question should open new ground, not grind the same ground finer.
- BREADTH BEFORE DEPTH: cover the whole map first, then dig. In the early turns deliberately move ACROSS the main areas so you build a wide picture fast; do not exhaust one area (or fixate on one product, project, or story) before touching the others. Spend at most a question or two on any single sub-topic, mentally note the rich threads, and come back to only the best one or two for real depth later. If your last two questions were about the same narrow thing, zoom out and open a NEW area. The person should feel the conversation covering ground quickly, not tunneling into one corner, which is what makes an interview feel tedious.
- MAKE THE PURPOSE FELT: the respondent should never feel the questions are pointless. Every so often, in a few words, reflect what a detail reveals or where you are heading ("that tells me where your real value sits, so let me ask..."), so the conversation visibly builds toward something rather than wandering.`;

// A subtle A/B experiment nudge appended to an interview's system prompt.
export function expNudge(n?: string): string {
  return n && n.trim() ? `\n\nSTYLE NOTE (a subtle adjustment, keep everything else exactly the same): ${n.trim()}` : "";
}

// ---------------------------------------------------------------------------
// Interview pacing.
//
// Every interview prompt in here has always ended with some version of "after
// roughly N exchanges, reflect the throughline and close". None of them did it
// reliably: a job interview ran to nine exchanges in testing without ever
// closing, and would have kept going. Counting its own turns across a long
// history is exactly the thing a model is unreliable at.
//
// So don't ask it to count. Tell it where it is, on every turn. The target
// stays a property of each interview (some want four exchanges, some eight);
// this only makes the instruction enforceable.
//
// Learner testing also showed the length isn't buying much: a four-exchange
// interview produced a report 93% the size of a nine-exchange one. Closing on
// time costs the artifact very little and the learner a great deal.
// ---------------------------------------------------------------------------

/** Which exchange is about to happen, 1-based. */
export function interviewTurn(history: ChatMsg[]): number {
  return history.filter((m) => m.role === "assistant").length + 1;
}

/** What the learner should see: "Question 3 of 6". */
export function interviewProgress(history: ChatMsg[], target: number): { turn: number; target: number; done: boolean } {
  const turn = interviewTurn(history);
  return { turn: Math.min(turn, target), target, done: turn > target };
}

export function pacingDirective(history: ChatMsg[], target: number): string {
  const n = interviewTurn(history);
  if (n < target) {
    return `\n\nPACING — you are on question ${n} of about ${target}. Ask ONE question and keep moving; don't linger on a detail you already have.`;
  }
  if (n === target) {
    return `\n\nPACING — this is question ${target}, your LAST. Ask the single most valuable remaining question, then be ready to close.`;
  }
  return `\n\nPACING — you are past ${target} exchanges and you have enough. Do NOT ask another question. Reflect the throughline you heard in two or three sentences, ask if there is anything important you missed, thank them, and stop.`;
}

/** Has the interview used up its budget? */
export function interviewOverBudget(history: ChatMsg[], target: number): boolean {
  return interviewTurn(history) > target;
}

// Past the budget, the interviewer is not asked to restrain itself — it is
// replaced.
//
// Appending "do not ask a question" to a prompt whose whole identity is "you
// are an interviewer, ask ONE short question per message" sets two instructions
// against each other, and the interviewer wins: two different wordings of the
// restraint both failed, and the tighter one did worse. So at the budget we
// stop sending the interviewer prompt at all and send this instead. There is no
// persona here to keep interviewing with.
const INTERVIEW_CLOSING_SYSTEM = `An interview has just finished. Your only job is to close it warmly and stop.

Write, in this order and nothing else:
1. Two or three sentences reflecting the throughline you heard — what this person's real value is, and what gets in its way. Use their own words where you can.
2. One short line asking whether there is anything important you missed.

Then stop. Do not ask about anything new. Do not summarise their answers back point by point. Do not give advice, offer a plan, or start redesigning anything. Plain, warm, specific to what they actually said. No headings, no bullet points, no em dashes.`;

// The same, once they have replied to the closing line: there is nothing left
// to do but thank them.
const INTERVIEW_SIGNOFF_SYSTEM = `An interview has finished and the person has just answered your last check. Thank them in one or two warm sentences, referring to something specific they said, and tell them they can move on whenever they are ready. Ask nothing. No headings, no em dashes.`;

/**
 * Close out an interview that has run its budget. Deliberately does NOT take the
 * interviewer's system prompt: the transcript is all the context it needs, and
 * leaving the persona out is the whole point.
 */
export async function interviewClosingReply(
  history: ChatMsg[],
  target: number,
  context: string,
  onToken?: (d: string) => void
): Promise<string> {
  // One turn past the budget = reflect and check. Any further = sign off.
  const system = interviewTurn(history) > target + 1 ? INTERVIEW_SIGNOFF_SYSTEM : INTERVIEW_CLOSING_SYSTEM;
  const transcript = history
    .slice(-24)
    .map((m) => `${m.role === "user" ? "THEM" : "YOU"}: ${m.content}`)
    .join("\n\n");
  return complete(
    [
      { role: "system", content: context ? `${system}\n\n${context}` : system },
      { role: "user", content: `The interview transcript:\n\n${transcript}` },
    ],
    { temperature: 0.6, maxTokens: 320, onToken }
  );
}

// tiny local hygiene for the presence prompt (the AI boundary stays in lib/ai)
export function data0(s: string | undefined, max: number): string {
  return String(s || "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, " ").replace(/`{3,}/g, "``").trim().slice(0, max);
}