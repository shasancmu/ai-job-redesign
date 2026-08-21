// Server-side helper for streaming a chat turn to the browser over SSE.
//
// A route hands us a `run` function that does the actual generation and calls
// `emit(delta)` for each token as it arrives. We wrap that in a ReadableStream
// that sends three kinds of frames the client understands:
//   { t: "chunk", v }  a piece of the reply
//   { t: "done", text} the full reply (authoritative; client replaces with this)
//   { t: "error", message } generation failed
// Errors are delivered inside the stream (not as a non-200) so a failure that
// happens mid-generation still reaches a client that has already started reading.
export function streamingResponse(run: (emit: (delta: string) => void) => Promise<string>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => {
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`)); } catch { /* closed */ }
      };
      try {
        const full = await run((delta) => send({ t: "chunk", v: delta }));
        send({ t: "done", text: full });
      } catch (e: any) {
        send({ t: "error", message: e?.message || "Something went wrong. Please try again." });
      } finally {
        try { controller.close(); } catch { /* already closed */ }
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Tell any proxy (nginx/Vercel) not to buffer, so tokens flush immediately.
      "X-Accel-Buffering": "no",
    },
  });
}
