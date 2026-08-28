// Robust, dependency-light PDF text extraction that survives serverless
// bundling (Vercel). We drive pdfjs-dist's legacy build directly, worker-free,
// with no external font/cmap assets. pdfjs is externalized in next.config so
// it stays a real file on disk (its import.meta.url worker/cmap paths resolve
// to real paths, which is exactly what breaks when the module is bundled) and
// its files are traced into the function. Embedded fonts (LaTeX/pdfTeX,
// PowerPoint exports) carry their own ToUnicode, so text still comes out clean.
//
// Returns extracted text (may be "" for a scanned/image-only PDF). Throws only
// on a genuinely unreadable/corrupt PDF, which callers should surface honestly.
// pdfjs v5 calls Promise.withResolvers, which only exists on Node 22+. Vercel
// functions may run an older Node, where every PDF would otherwise throw before a
// single page is read (this is why text PDFs failed in production but worked
// locally on Node 22). Polyfill it so extraction is Node-version independent.
function ensureWithResolvers(): void {
  const P = Promise as any;
  if (typeof P.withResolvers !== "function") {
    P.withResolvers = function <T>() {
      let resolve!: (v: T | PromiseLike<T>) => void;
      let reject!: (reason?: any) => void;
      const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
      return { promise, resolve, reject };
    };
  }
}

export async function extractPdfText(buf: Buffer): Promise<string> {
  ensureWithResolvers();
  const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buf),
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: false,
    disableFontFace: true,
    verbosity: 0,
  }).promise;
  try {
    let out = "";
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      out += content.items.map((it: any) => ("str" in it ? it.str : "")).join(" ") + "\n";
      page.cleanup();
    }
    return out;
  } finally {
    try { await doc.destroy(); } catch { /* ignore */ }
  }
}
