import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "@/components/ProfileForm";
import ChangePassword from "@/components/ChangePassword";
import ManageSubscription from "@/components/ManageSubscription";
import { PAYMENTS_ENABLED } from "@/lib/stripe";
import { activeEntitlements } from "@/lib/access";
import Logo from "@/components/Logo";

export default async function ProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/profile");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const p = (profile || {}) as any;
  const ents = PAYMENTS_ENABLED ? await activeEntitlements(supabase, user.id) : new Set<string>();
  const hasPlan = ents.has("all");

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Logo />
        <Link href="/dashboard" className="btn-ghost text-sm">← Dashboard</Link>
      </header>

      <h1 className="text-2xl font-bold">Your profile</h1>
      <p className="mt-1 text-sm text-slate-500">{user.email}</p>

      <section className="card mt-6 p-6">
        <ProfileForm
          me={user.id}
          initial={{
            display_name: p.display_name,
            segment: p.segment,
            goal: p.goal,
            team_size: p.team_size,
            founder_stage: p.founder_stage,
            study_field: p.study_field,
            grad_year: p.grad_year,
          }}
        />
      </section>

      <section className="card mt-5 p-6">
        <h2 className="text-sm font-bold text-ink">Password</h2>
        <p className="mb-3 mt-1 text-xs text-slate-400">Set a new password for your account.</p>
        <ChangePassword />
      </section>

      {hasPlan && (
        <section className="card mt-5 p-6">
          <h2 className="text-sm font-bold text-ink">Billing</h2>
          <p className="mb-3 mt-1 text-xs text-slate-400">You have full access. Update your card, view invoices, or cancel anytime.</p>
          <ManageSubscription />
        </section>
      )}
    </main>
  );
}
