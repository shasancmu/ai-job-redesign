import { ImageResponse } from "next/og";
import { loadReportPreview } from "@/lib/reportPreview";

// Per-report social card. When someone drops a /r/<token> link into LinkedIn,
// Slack, or a text, this renders a designed preview with the report's own
// headline instead of a blank generic card. Same token trust model as the page.
export const runtime = "nodejs";
export const alt = "A Superadditive report";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const SAGE = "#3F7A52";
const INK = "#14283A";
const SLATE = "#4B5A69";

export default async function Image({ params }: { params: { token: string } }) {
  const p = await loadReportPreview(params.token).catch(() => null);
  const eyebrow = (p?.eyebrow || "Superadditive").toUpperCase();
  const title = (p?.title || "A shared report").slice(0, 90);
  const summary = (p?.summary || "AI for business strategy and innovation.").slice(0, 170);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#FBFCFD",
          padding: "72px 80px",
          justifyContent: "space-between",
        }}
      >
        {/* accent bar */}
        <div style={{ display: "flex", position: "absolute", top: 0, left: 0, right: 0, height: 12, background: SAGE }} />

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", color: SAGE, fontSize: 26, letterSpacing: 3, fontWeight: 700 }}>{eyebrow}</div>
          <div style={{ display: "flex", marginTop: 28, color: INK, fontSize: 76, lineHeight: 1.05, fontWeight: 800, maxWidth: 1000 }}>{title}</div>
          <div style={{ display: "flex", marginTop: 28, color: SLATE, fontSize: 34, lineHeight: 1.35, maxWidth: 980 }}>{summary}</div>
        </div>

        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", width: 34, height: 34, borderRadius: 10, background: SAGE }} />
          <div style={{ display: "flex", marginLeft: 16, color: INK, fontSize: 30, fontWeight: 700 }}>Superadditive</div>
          <div style={{ display: "flex", marginLeft: 16, color: "#93A2B0", fontSize: 26 }}>· AI for business strategy and innovation</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
