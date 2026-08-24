import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roleFor } from "@/lib/orgs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "deck-media";

// Upload an image for a slide to Supabase Storage; returns its public URL.
// Gated to deck authors (instructor/director/superadmin).
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  const role = await roleFor(user);
  if (!(role.superadmin || role.directorOrgIds.length > 0 || role.instructorOrgIds.length > 0)) {
    return Response.json({ error: "Not allowed." }, { status: 403 });
  }

  let form: FormData;
  try { form = await request.formData(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const file = form.get("file") as File | null;
  if (!file) return Response.json({ error: "No file." }, { status: 400 });
  if (!/^image\/(jpeg|jpg|png|webp|gif|svg\+xml)$/i.test(file.type)) return Response.json({ error: "Images only (jpg, png, webp, gif, svg)." }, { status: 400 });
  if (file.size > 8 * 1024 * 1024) return Response.json({ error: "Image must be under 8MB." }, { status: 400 });

  try {
    const admin = createAdminClient();
    await admin.storage.createBucket(BUCKET, { public: true }).catch(() => {});
    const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
    const path = `${user.id}/${Date.now()}-${Math.floor(Math.random() * 1e6)}.${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await admin.storage.from(BUCKET).upload(path, buf, { contentType: file.type || "image/png", upsert: true });
    if (upErr) return Response.json({ error: upErr.message }, { status: 400 });
    const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
    return Response.json({ url: pub.publicUrl });
  } catch (e: any) {
    return Response.json({ error: e?.message || "upload failed" }, { status: 500 });
  }
}
