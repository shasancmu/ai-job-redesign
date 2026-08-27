import { AI_ENABLED, VISION_ENABLED, photoDescribeAI } from "@/lib/ai";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BUCKET = "business-photos";

// PUBLIC: store one standardized business photo and read it into structured text.
export async function POST(request: Request) {
  if (!AI_ENABLED || !VISION_ENABLED) return Response.json({ error: "Photo analysis is not configured." }, { status: 503 });
  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const image = String(body.image || "");
  const m = image.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/i);
  if (!m) return Response.json({ error: "Please attach a photo." }, { status: 400 });
  if (image.length > 8_000_000) return Response.json({ error: "That photo is too large." }, { status: 413 });
  const shot = String(body.shot || "").slice(0, 300);
  const biz = String(body.business || "").slice(0, 200);

  // Store the image in Supabase Storage.
  let url = "";
  try {
    const ct = m[1].toLowerCase();
    const ext = ct.split("/")[1].replace("jpeg", "jpg");
    const bytes = Buffer.from(m[2], "base64");
    const path = `${(globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.round(Math.random() * 1e9)}`)}.${ext}`;
    const admin = createAdminClient();
    const { error } = await admin.storage.from(BUCKET).upload(path, bytes, { contentType: ct, upsert: false });
    if (!error) url = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  } catch { /* storage not configured; continue with text only */ }

  // Read it into text.
  try {
    const prompt = `This is a standardized business photo. ${shot || "Describe what the photo reveals about the operation, products, space, and scale."}${biz ? ` The business: ${biz}.` : ""} Be specific and factual, and note anything that indicates scale, organization, and quality.`;
    const d = await photoDescribeAI(image, prompt);
    return Response.json({ title: d.title, description: d.description || d.transcript || "", url });
  } catch (e: any) {
    return Response.json({ title: "", description: "", url, error: e?.message || "Couldn't read the photo." }, { status: 200 });
  }
}
