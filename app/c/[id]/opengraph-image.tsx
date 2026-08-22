import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/admin";
import { describeCredential } from "@/lib/credentials";

export const runtime = "nodejs";
export const alt = "A Superadditive credential";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const SAGE = "#3F7A52";
const INK = "#14283A";
const SLATE = "#4B5A69";

const isId = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

export default async function Image({ params }: { params: { id: string } }) {
  let holder = "A Superadditive member";
  let eyebrow = "CREDENTIAL";
  let title = "A completed exercise";
  let line = "AI for business strategy and innovation.";

  if (params.id === "sample") {
    holder = "Alex Morgan";
    const v = describeCredential("track", "strategist", "The Strategist");
    eyebrow = v.eyebrow;
    title = v.title;
    line = v.line;
  } else if (isId(params.id)) {
    try {
      const admin = createAdminClient();
      const { data: cred } = await admin
        .from("credentials")
        .select("user_id,kind,ckey,title")
        .eq("id", params.id)
        .maybeSingle();
      if (cred) {
        const v = describeCredential((cred as any).kind, (cred as any).ckey, (cred as any).title);
        eyebrow = v.eyebrow;
        title = v.title.slice(0, 80);
        line = v.line.slice(0, 150);
        const { data: prof } = await admin
          .from("profiles")
          .select("display_name")
          .eq("id", (cred as any).user_id)
          .maybeSingle();
        if ((prof as any)?.display_name) holder = (prof as any).display_name;
      }
    } catch {
      /* fall through to defaults */
    }
  }

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
        <div style={{ display: "flex", position: "absolute", top: 0, left: 0, right: 0, height: 14, background: SAGE }} />

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", width: 40, height: 40, borderRadius: 12, background: SAGE, color: "#fff", fontSize: 24, fontWeight: 800, alignItems: "center", justifyContent: "center" }}>S</div>
            <div style={{ display: "flex", marginLeft: 16, color: SAGE, fontSize: 24, letterSpacing: 4, fontWeight: 700 }}>{eyebrow}</div>
          </div>
          <div style={{ display: "flex", marginTop: 28, color: INK, fontSize: 68, lineHeight: 1.05, fontWeight: 800, maxWidth: 1000 }}>{title}</div>
          <div style={{ display: "flex", marginTop: 22, color: SLATE, fontSize: 32, lineHeight: 1.35, maxWidth: 980 }}>{line}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", color: "#93A2B0", fontSize: 24 }}>Issued to</div>
          <div style={{ display: "flex", marginTop: 4, alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", color: INK, fontSize: 40, fontWeight: 700 }}>{holder}</div>
            <div style={{ display: "flex", alignItems: "center", color: SAGE, fontSize: 26, fontWeight: 700 }}>
              <div style={{ display: "flex", width: 16, height: 16, borderRadius: 8, background: SAGE, marginRight: 10 }} />
              Verified · Superadditive
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
