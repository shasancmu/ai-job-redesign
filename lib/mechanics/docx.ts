// Minimal, dependency-free .docx text extraction. A .docx is a ZIP; the body is
// word/document.xml. We read the ZIP central directory, inflate that one entry
// with Node's built-in zlib, and strip the XML to text. Good enough to ground an
// AI draft; returns "" on any parse trouble so callers degrade gracefully.
import * as zlib from "zlib";

export function extractDocxText(buf: Buffer): string {
  try {
    const EOCD = 0x06054b50, CEN = 0x02014b50, LOC = 0x04034b50;
    // Find End Of Central Directory, scanning back from the end.
    let eocd = -1;
    const from = Math.max(0, buf.length - 22 - 65536);
    for (let i = buf.length - 22; i >= from; i--) { if (buf.readUInt32LE(i) === EOCD) { eocd = i; break; } }
    if (eocd < 0) return "";
    const cdCount = buf.readUInt16LE(eocd + 10);
    let p = buf.readUInt32LE(eocd + 16);
    let localOffset = -1, method = 8, compSize = 0;
    for (let n = 0; n < cdCount; n++) {
      if (buf.readUInt32LE(p) !== CEN) break;
      const m = buf.readUInt16LE(p + 10);
      const cSize = buf.readUInt32LE(p + 20);
      const fnLen = buf.readUInt16LE(p + 28);
      const extraLen = buf.readUInt16LE(p + 30);
      const commentLen = buf.readUInt16LE(p + 32);
      const lho = buf.readUInt32LE(p + 42);
      const name = buf.toString("utf8", p + 46, p + 46 + fnLen);
      if (name === "word/document.xml") { localOffset = lho; method = m; compSize = cSize; break; }
      p += 46 + fnLen + extraLen + commentLen;
    }
    if (localOffset < 0 || buf.readUInt32LE(localOffset) !== LOC) return "";
    const lfnLen = buf.readUInt16LE(localOffset + 26);
    const lextraLen = buf.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + lfnLen + lextraLen;
    const comp = buf.subarray(dataStart, dataStart + compSize);
    const xml = (method === 0 ? comp : zlib.inflateRawSync(comp)).toString("utf8");
    return xmlToText(xml);
  } catch { return ""; }
}

function xmlToText(xml: string): string {
  return xml
    .replace(/<w:tab\b[^>]*\/?>/g, "\t")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<w:br\b[^>]*\/?>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => { try { return String.fromCharCode(+d); } catch { return ""; } })
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
