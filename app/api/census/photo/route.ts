import { AI_ENABLED, VISION_ENABLED, photoDescribeAI } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// PUBLIC: read one business photo into structured text. The image is not stored.
export async function POST(request: Request) {
  if (!AI_ENABLED || !VISION_ENABLED) return Response.json({ error: "Photo analysis is not configured." }, { status: 503 });
  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const image = String(body.image || "");
  if (!/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(image)) return Response.json({ error: "Please attach a photo." }, { status: 400 });
  if (image.length > 8_000_000) return Response.json({ error: "That photo is too large." }, { status: 413 });
  const shot = String(body.shot || "").slice(0, 300);
  const biz = String(body.business || "").slice(0, 200);
  try {
    const prompt = `This is a standardized business photo. ${shot || "Describe what the photo reveals about the operation, products, space, and scale."}${biz ? ` The business: ${biz}.` : ""} Be specific and factual, and note anything that indicates scale, organization, and quality.`;
    const d = await photoDescribeAI(image, prompt);
    return Response.json({ title: d.title, description: d.description || d.transcript || "" });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Couldn't read the photo." }, { status: 200 });
  }
}
