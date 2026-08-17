import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AI_ENABLED, disclosureReviewAI } from "@/lib/ai";
import { domainsFor, variantForExercise, answeredCount } from "@/lib/disclosure";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Buyer-only: score the vendor's disclosure against the framework.
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in." }, { status: 401 });
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const code = String(body.code || "").toUpperCase();

  const { data: session } = await supabase.from("sessions").select("id, host_id, exercise").eq("code", code).maybeSingle();
  if (!session || session.host_id !== user.id) return Response.json({ error: "Not found." }, { status: 404 });

  const { data: ws } = await supabase.from("workspaces").select("id, canvas").eq("session_id", session.id).eq("author_id", user.id).maybeSingle();
  const canvas = (ws?.canvas as any) || {};
  const responses: Record<string, string> = canvas.responses || {};
  if (answeredCount(responses) < 3) return Response.json({ error: "Not enough answers to review yet." }, { status: 422 });

  const variant = variantForExercise(session.exercise);
  const isAi = variant === "haip" ? true : !!canvas.isAi;
  const domains = domainsFor(variant, isAi).map((d) => ({
    key: d.key,
    title: d.title,
    questions: d.questions.map((q) => ({ key: q.key, label: q.label })),
  }));

  let review: any;
  try {
    review = await disclosureReviewAI({
      vendor: String(canvas.vendor || ""),
      product: String(canvas.product || ""),
      framework: variant === "haip" ? "the HAIP AI Vendor Disclosure Framework (Health AI Partnership)" : "a vendor disclosure framework adapted from the Health AI Partnership (HAIP) framework",
      domains,
      responses,
    });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Couldn't run the review." }, { status: 502 });
  }

  // Persist the review (via admin so RLS on update isn't an issue).
  try {
    const admin = createAdminClient();
    await admin.from("workspaces").update({ canvas: { ...canvas, review }, updated_at: new Date().toISOString() }).eq("id", ws!.id);
  } catch {
    /* non-fatal — still return the review */
  }

  return Response.json({ ok: true, review });
}
