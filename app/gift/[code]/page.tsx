import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";
import GiftReveal from "@/components/GiftReveal";

export const dynamic = "force-dynamic";

// The gift you RECEIVE: the reimagined role your partner (the other participant
// in this paired session) designed for you. Same /gift/[code] URL works for both
// partners, each seeing what the other made for them.
export const metadata = { title: "A gift for you" };

export default async function GiftPage({ params }: { params: { code: string } }) {
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
    .select("id, host_id, guest_id")
    .eq("code", code)
    .maybeSingle();
  if (!session) redirect("/dashboard");

  // The giver is the OTHER participant. Admins previewing see the host's gift to
  // the guest.
  let recipientId = user.id;
  let giverId: string | null = null;
  if (user.id === session.host_id) giverId = session.guest_id;
  else if (user.id === session.guest_id) giverId = session.host_id;
  else if (admin) {
    recipientId = session.guest_id || session.host_id;
    giverId = session.host_id;
  }
  if (!giverId) return <NoGift code={code} />;

  const { data: ws } = await db
    .from("workspaces")
    .select("plan, final_description, new_job_description, real_job")
    .eq("session_id", session.id)
    .eq("author_id", giverId)
    .maybeSingle();

  const plan = ws?.plan as any;
  const hasPlan =
    plan && (plan.headline || plan.summary || (plan.human?.length || 0) + (plan.ai?.length || 0) > 0);
  const textRedesign = ws?.final_description || ws?.new_job_description || "";
  if (!hasPlan && !textRedesign) return <NoGift code={code} />;

  const [{ data: giver }, { data: me }] = await Promise.all([
    db.from("profiles").select("display_name").eq("id", giverId).maybeSingle(),
    db.from("profiles").select("display_name").eq("id", recipientId).maybeSingle(),
  ]);

  return (
    <GiftReveal
      code={code}
      giverName={giver?.display_name || "your partner"}
      recipientName={me?.display_name || null}
      plan={hasPlan ? plan : null}
      textRedesign={textRedesign}
      realJob={ws?.real_job || ""}
    />
  );
}

function NoGift({ code }: { code: string }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <div className="text-4xl">🎁</div>
      <h1 className="mt-3 text-2xl font-bold text-ink">Your gift isn&rsquo;t ready yet</h1>
      <p className="mt-2 text-slate2">
        Your partner is still designing your reimagined role. Check back once they&rsquo;ve built it.
      </p>
      <Link href={`/room/${code}`} className="btn-primary mt-6">
        ← Back to the exercise
      </Link>
    </main>
  );
}
