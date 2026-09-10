import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runAutopilot } from "@/lib/autopilot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// The autonomous heartbeat. Vercel Cron calls this on a schedule (see
// vercel.json); it runs one closed-loop pass over the experiment engine —
// adopting winners, ratcheting them into the baseline, and opening the next
// subtle test — so the platform keeps improving its own conversations without a
// human in the loop. Protected by CRON_SECRET (sent as a bearer token).
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization") || "";
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const admin = createAdminClient();
    const log = await runAutopilot(admin, { launch: true });
    return NextResponse.json({ ok: true, actions: log.length, log });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
