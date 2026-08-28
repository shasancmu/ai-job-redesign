"use client";

// Extract PDF text IN THE BROWSER, where pdfjs actually belongs. Doing it here
// sidesteps every server-side failure we hit on Vercel (the Node-22-only
// Promise.withResolvers, serverless bundling, worker/asset tracing). The page
// sends the server plain text, so the upload flow never depends on the function
// runtime to parse a PDF.
let pdfjsPromise: Promise<any> | null = null;

async function getPdfjs(): Promise<any> {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      // The worker is served as a same-origin static file (public/), copied from
      // this exact pdfjs version so the API and worker always match. Same origin
      // means it loads under the app's own CSP with no bundler gymnastics.
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      return pdfjs;
    })();
  }
  return pdfjsPromise;
}

export async function extractPdfTextClient(file: File | Blob): Promise<string> {
  const pdfjs = await getPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data, isEvalSupported: false, disableFontFace: true }).promise;
  try {
    let out = "";
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      out += content.items.map((it: any) => ("str" in it ? it.str : "")).join(" ") + "\n";
      page.cleanup();
    }
    return out.replace(/[ \t]+/g, " ").trim();
  } finally {
    try { await doc.destroy(); } catch { /* ignore */ }
  }
}
