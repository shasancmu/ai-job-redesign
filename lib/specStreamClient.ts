// Browser-side reader for the authoring SSE stream produced by
// lib/mechanics/specStream.ts.
//
// Every "describe it and build it" flow used to POST without `stream`, block on
// one response, and die at the AI client's timeout — a full module spec takes
// longer to write than a single blocking call is allowed to last. Streaming
// keeps the connection alive and, just as importantly, lets the author watch
// real progress instead of a spinner.
//
// Falls back to plain JSON if a route answers without streaming, so a caller
// can't break by pointing at one that hasn't been converted.
export type BuildProgress = { chars: number; name: string; stage?: string };

export async function streamSpec(
  endpoint: string,
  body: Record<string, unknown>,
  onProgress?: (p: BuildProgress) => void,
  signal?: AbortSignal
): Promise<any> {
  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, stream: true }),
      signal,
    });
  } catch {
    // A dropped connection surfaced as a bare "network error", which tells an
    // author nothing about whether their description was the problem (it wasn't)
    // or whether pressing the button again is worth it (it is).
    throw new Error("Lost the connection while drafting. Your description is still here — press Build again.");
  }

  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("text/event-stream") || !res.body) {
    // A route that hasn't been converted (or an auth/validation error) answers
    // with plain JSON; surface its message rather than a generic failure.
    const d = await res.json().catch(() => ({} as any));
    if (!res.ok || !d?.spec) throw new Error(d?.error || "Couldn't build a draft. Try rephrasing.");
    return d.spec;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let spec: any = null;
  let errText = "";
  let sawContent = false;
  let stage = "";
  let lastChars = 0;
  let lastName = "";

  for (;;) {
    let chunk: ReadableStreamReadResult<Uint8Array>;
    try {
      chunk = await reader.read();
    } catch {
      // Mid-stream drop. Same story: not the author's fault, and retryable.
      throw new Error("Lost the connection while drafting. Your description is still here — press Build again.");
    }
    const { done, value } = chunk;
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let sep: number;
    while ((sep = buf.indexOf("\n\n")) >= 0) {
      const line = buf.slice(0, sep).split("\n").find((l) => l.startsWith("data:"));
      buf = buf.slice(sep + 2);
      if (!line) continue;
      let evt: any;
      try { evt = JSON.parse(line.slice(5).trim()); } catch { continue; }
      if (evt.type === "stage") { stage = evt.label || stage; onProgress?.({ chars: lastChars, name: lastName, stage }); }
      else if (evt.type === "progress") {
        sawContent = true;
        lastChars = evt.chars || 0;
        lastName = evt.name || lastName;
        onProgress?.({ chars: lastChars, name: lastName, stage });
      }
      else if (evt.type === "done") spec = evt.spec;
      else if (evt.type === "error") errText = evt.error || "";
    }
  }

  if (!spec) {
    // A stream that carried real content and then stopped without a terminal
    // event was cut off — the server ran out of time, not out of ideas. Say so,
    // because "try rephrasing" sends the author to fix the one thing that was fine.
    if (errText) throw new Error(errText);
    throw new Error(
      sawContent
        ? "The draft was cut off before it finished. Try again — or shorten the description."
        : "Couldn't build a draft. Try rephrasing."
    );
  }
  return spec;
}
