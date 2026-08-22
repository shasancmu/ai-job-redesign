import { AI_ENABLED, quickTakeAI } from "@/lib/ai";
import { setFlow } from "@/lib/aiflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PUBLIC, no-auth: the 90-second onboarding "quick take" that runs BEFORE signup
// (value before the gate). Cheap single call; guarded with a honeypot and tight
// input caps. Logged under the "quick-take" flow so its cost/errors are visible.
export async function POST(request: Request) {
  if (!AI_ENABLED) return Response.json({ error: "Not available right now." }, { status: 503 });
  setFlow("quick-take");

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }

  // Honeypot: real users never fill this hidden field; bots do. Pretend success.
  if (body.website) return Response.json({ ok: true });

  const role = String(body.role || "").slice(0, 400).trim();
  const share = String(body.share || "").slice(0, 40);
  if (role.length < 3) return Response.json({ error: "Tell me a bit more about what you do." }, { status: 400 });

  try {
    const take = await quickTakeAI({ role, share });
    return Response.json({ take });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Couldn't read that. Try again." }, { status: 502 });
  }
}
