// Turn a module-copilot generation into a streamed Server-Sent-Events response,
// so the Build step shows live progress instead of a long frozen spinner. Emits
// { type: "progress", chars, name } as tokens arrive, then a single terminal
// { type: "done", spec, errors } or { type: "error", error }. Callers that want
// the old one-shot JSON keep calling moduleCopilotAI directly.
import { moduleCopilotStream } from "@/lib/ai";

// Best-effort peek at the module's name as it streams in, for a nicer reveal.
function peekName(text: string): string {
  const m = text.match(/"name"\s*:\s*"([^"\\]{2,80})"/);
  return m ? m[1] : "";
}

export function streamSpecResponse(
  system: string,
  user: string,
  validate?: (spec: any) => string[],
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (obj: any) => { if (!closed) controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`)); };
      let acc = "";
      let lastName = "";
      let lastPing = 0;
      try {
        const spec = await moduleCopilotStream(system, user, (delta) => {
          acc += delta;
          // Throttle progress events so we never flood the stream.
          const name = peekName(acc);
          if (acc.length - lastPing >= 60 || (name && name !== lastName)) {
            lastPing = acc.length;
            lastName = name || lastName;
            send({ type: "progress", chars: acc.length, name: lastName });
          }
        });
        if (!spec || typeof spec !== "object") {
          send({ type: "error", error: "The copilot couldn't produce a module. Try rephrasing." });
        } else {
          send({ type: "done", spec, errors: validate ? validate(spec) : [] });
        }
      } catch (e: any) {
        send({ type: "error", error: e?.message || "AI request failed." });
      } finally {
        closed = true;
        try { controller.close(); } catch { /* already closed */ }
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
