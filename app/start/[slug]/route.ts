import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { moduleBySlug } from "@/lib/modules";
import { loadRunnableBySlug } from "@/lib/customModules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAIRED = new Set(["job", "workflow"]);
function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 5; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

// One-click start for a module (used by the "Your work" hub's next-step and
// do-again actions). Paired modules go to the pairing screen; group modules
// need a cohort; everything else spins up a solo session and opens the room.
export async function GET(request: Request, { params }: { params: { slug: string } }) {
  const { origin } = new URL(request.url);
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login?next=/start/${params.slug}`);

  const mod = moduleBySlug(params.slug);
  // Author-built module? Resolve its exercise key, visibility-checked for this user.
  let exercise: string;
  if (mod) {
    if (PAIRED.has(mod.exercise)) return NextResponse.redirect(`${origin}/pair/${mod.slug}`);
    if (mod.partner === "group") return NextResponse.redirect(`${origin}/dashboard`); // needs a cohort link
    exercise = mod.exercise;
  } else {
    const custom = await loadRunnableBySlug(params.slug, user.id);
    if (!custom) return NextResponse.redirect(`${origin}/dashboard`);
    exercise = custom.exercise;
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeCode();
    const { data, error } = await supabase
      .from("sessions")
      .insert({ code, host_id: user.id, status: "active", exercise })
      .select()
      .single();
    if (!error && data) return NextResponse.redirect(`${origin}/room/${code}`);
    if (error && !`${error.message}`.toLowerCase().includes("duplicate")) break;
  }
  return NextResponse.redirect(`${origin}/dashboard`);
}
