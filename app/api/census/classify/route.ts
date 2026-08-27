import { AI_ENABLED, businessClassifyAI } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PUBLIC: classify a business into NAICS + ISIC from a description.
export async function POST(request: Request) {
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });
  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const desc = String(body.desc || "").trim().slice(0, 600);
  if (!desc) return Response.json({ error: "Describe what the business does." }, { status: 400 });
  try {
    const c = await businessClassifyAI(desc, String(body.country || ""));
    if (!c) return Response.json({ error: "Couldn't classify. You can continue." }, { status: 200 });
    return Response.json(c);
  } catch (e: any) {
    return Response.json({ error: e?.message || "Classification failed." }, { status: 200 });
  }
}
