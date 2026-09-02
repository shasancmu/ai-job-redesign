// Browser-side reader for the SSE chat stream produced by lib/stream.ts.
//
// POSTs `body` to `url`, then calls `onChunk(delta)` for every token as it
// arrives and resolves with the full reply text. Pass an AbortSignal to cancel
// (e.g. the user navigates away or hits stop). Throws on a transport error or on
// an in-stream { t: "error" } frame, so callers can try/catch a single place.
export async function streamPost(
  url: string,
  body: unknown,
  onChunk: (delta: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  // A route may still answer with a plain JSON error (auth, bad input) instead
  // of a stream; surface its message rather than a generic failure.
  if (!res.ok || !res.body) {
    let msg = `Request failed (${res.status}).`;
    try { const j = await res.json(); if (j?.error) msg = j.error; } catch { /* not json */ }
    throw new Error(msg);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let full = "";
  let errored = "";
  let sawFrame = false; // did the body ever parse as SSE at all?
  let sawBytes = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    if (buf) sawBytes = true;
    let sep: number;
    while ((sep = buf.indexOf("\n\n")) >= 0) {
      sawFrame = true;
      const frame = buf.slice(0, sep);
      buf = buf.slice(sep + 2);
      const line = frame.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      let evt: any;
      try { evt = JSON.parse(line.slice(5).trim()); } catch { continue; }
      if (evt.t === "chunk") { full += evt.v; onChunk(evt.v); }
      else if (evt.t === "done") { if (typeof evt.text === "string") full = evt.text; }
      else if (evt.t === "error") { errored = evt.message || "Something went wrong."; }
    }
  }
  if (errored) throw new Error(errored);
  // A route that answers 200 with a non-SSE body (e.g. plain JSON) would parse
  // as zero frames and return "" — a silent dead end for the caller. Treat that
  // as the wiring bug it is rather than swallowing it.
  if (!sawFrame && sawBytes) {
    throw new Error(`${url} did not return an event stream.`);
  }
  return full;
}
