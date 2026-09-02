import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";
import { domainsFor, variantForExercise } from "@/lib/disclosure";
import DisclosureReport from "@/components/DisclosureReport";

export const dynamic = "force-dynamic";

export const metadata = { title: "Disclosure" };

export default async function DisclosureArtifact({ params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = isAdmin(user.email);
  let db: any = supabase;
  if (admin) {
    try { db = createAdminClient(); } catch { /* fall back */ }
  }

  const { data: session } = await db.from("sessions").select("id, host_id, exercise").eq("code", code).maybeSingle();
  if (!session || (session.exercise !== "disclosure" && session.exercise !== "disclosure-haip")) redirect("/dashboard");
  if (!admin && session.host_id !== user.id) redirect("/dashboard");

  const { data: ws } = await db.from("workspaces").select("canvas").eq("session_id", session.id).eq("author_id", session.host_id).maybeSingle();
  const canvas = (ws?.canvas as any) || {};

  if (!canvas.submittedAt) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-bold text-ink">Nothing to show yet</h1>
        <p className="mt-2 text-slate2">The vendor hasn&apos;t submitted this disclosure yet.</p>
        <Link href={`/room/${code}`} className="btn-primary mt-6">← Back</Link>
      </main>
    );
  }

  const variant = variantForExercise(session.exercise);
  const isAi = variant === "haip" ? true : !!canvas.isAi;
  const domains = domainsFor(variant, isAi);

  return (
    <DisclosureReport
      code={code}
      variant={variant}
      vendor={canvas.vendor || ""}
      product={canvas.product || ""}
      submittedAt={canvas.submittedAt}
      domains={domains}
      responses={canvas.responses || {}}
      review={canvas.review || null}
    />
  );
}
