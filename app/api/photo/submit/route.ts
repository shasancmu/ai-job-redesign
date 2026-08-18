import { createAdminClient } from "@/lib/supabase/admin";
import { VISION_ENABLED, photoDescribeAI } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // vision can take a few seconds

// PUBLIC, no-auth. Receives an image (as a data URL), sends it to the vision
// model, stores ONLY the returned text, and discards the image. The image is
// never written to the database.
export async function POST(request: Request) {
  if (!VISION_ENABLED) return Response.json({ error: "Photo analysis is not configured." }, { status: 503 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const code = String(body.code || "").toUpperCase().trim();
  const image = String(body.image || "");
  if (!code) return Response.json({ error: "Missing code." }, { status: 400 });
  if (!/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(image)) {
    return Response.json({ error: "Please attach a photo." }, { status: 400 });
  }
  if (image.length > 8_000_000) {
    return Response.json({ error: "That photo is too large. Try again." }, { status: 413 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return Response.json({ error: "Not available." }, { status: 500 });
  }

  const { data: session } = await admin
    .from("photo_sessions")
    .select("id, status, prompt")
    .eq("code", code)
    .maybeSingle();
  if (!session) return Response.json({ error: "That code isn't valid." }, { status: 404 });
  if (session.status === "closed") return Response.json({ error: "This activity is closed." }, { status: 409 });

  let desc;
  try {
    desc = await photoDescribeAI(image, session.prompt || "");
  } catch (e: any) {
    return Response.json({ error: e?.message || "Couldn't read that photo. Try again." }, { status: 502 });
  }

  // Store ONLY the model's text output. The `image` variable is never persisted.
  const { error } = await admin.from("photo_entries").insert({
    session_id: session.id,
    kind: desc.kind,
    title: desc.title,
    description: desc.description,
    transcript: desc.transcript,
  });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true, kind: desc.kind, title: desc.title, description: desc.description, transcript: desc.transcript });
}
