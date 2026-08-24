import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";
import { resolveCanvasDefForUser } from "@/lib/customModules";
import CanvasView from "@/components/CanvasView";

export const dynamic = "force-dynamic";

export default async function CanvasPage({ params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = isAdmin(user.email);
  let db: any = supabase;
  if (admin) {
    try {
      db = createAdminClient();
    } catch {
      /* no service role — fall back to the user client */
    }
  }

  const { data: session } = await db
    .from("sessions")
    .select("id, host_id, guest_id, exercise")
    .eq("code", code)
    .maybeSingle();
  if (!session) redirect("/dashboard");
  if (!admin && session.host_id !== user.id && session.guest_id !== user.id) redirect("/dashboard");

  const def = await resolveCanvasDefForUser(session.exercise || "", admin ? session.host_id : user.id);
  if (!def) redirect("/dashboard");

  const authorId = admin ? session.host_id : user.id;
  const { data: ws } = await db
    .from("workspaces")
    .select("canvas")
    .eq("session_id", session.id)
    .eq("author_id", authorId)
    .maybeSingle();

  const canvas = (ws?.canvas as any) || {};
  const hasContent =
    canvas.synthesis ||
    canvas.verdict ||
    Object.values(canvas.fields || {}).some((v: any) => (Array.isArray(v) ? v.length : v));

  if (!hasContent) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-bold text-ink">Nothing here yet</h1>
        <p className="mt-2 text-slate2">
          Head back to the exercise and tap <b>Draft with AI</b> to build your canvas.
        </p>
        <Link href={`/room/${code}`} className="btn-primary mt-6">← Back to the exercise</Link>
      </main>
    );
  }

  return <CanvasView def={def} canvas={canvas} code={code} />;
}
