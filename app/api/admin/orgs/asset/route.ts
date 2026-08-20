import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperadmin } from "@/lib/orgs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "branding";

// Upload an org's logo or hero image to Supabase Storage and store its URL.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  if (!(await isSuperadmin(user))) return Response.json({ error: "Superadmin only." }, { status: 403 });

  let form: FormData;
  try { form = await request.formData(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const orgId = String(form.get("orgId") || "");
  const kind = form.get("kind") === "hero" ? "hero" : "logo";
  const file = form.get("file") as File | null;
  if (!orgId || !file) return Response.json({ error: "orgId and file required" }, { status: 400 });
  if (file.size > 4 * 1024 * 1024) return Response.json({ error: "Image must be under 4MB." }, { status: 400 });

  const admin = createAdminClient();
  try {
    // Ensure the public bucket exists (first upload creates it).
    await admin.storage.createBucket(BUCKET, { public: true }).catch(() => {});

    const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
    const path = `${orgId}/${kind}-${Date.now()}.${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await admin.storage.from(BUCKET).upload(path, buf, { contentType: file.type || "image/png", upsert: true });
    if (upErr) return Response.json({ error: upErr.message }, { status: 400 });

    const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
    const url = pub.publicUrl;
    const col = kind === "hero" ? "hero_image_url" : "logo_url";
    await admin.from("organizations").update({ [col]: url, updated_at: new Date().toISOString() }).eq("id", orgId);
    return Response.json({ url });
  } catch (e: any) {
    return Response.json({ error: e?.message || "upload failed" }, { status: 500 });
  }
}
