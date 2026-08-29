import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runAllAutomations } from "@/lib/automations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Daily cron (Vercel) that fires every enabled Relationship OS automation.
// Protected by CRON_SECRET — Vercel Cron sends it as a bearer token.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization") || "";
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const admin = createAdminClient();
    const res = await runAllAutomations(admin);
    return NextResponse.json({ ok: true, ...res });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
