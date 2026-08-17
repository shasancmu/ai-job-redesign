import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "@/components/ProfileForm";
import ChangePassword from "@/components/ChangePassword";
import Logo from "@/components/Logo";

const ORG_LABEL: Record<string, string> = {
  personal: "Personal email",
  education: "Education",
  corporate: "Company",
};

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

      {(p.org_type || p.country) && (
        <section className="mt-5 rounded-xl bg-mist p-4 text-xs text-slate-500">
          <div className="font-medium text-slate-600">What we can tell so far</div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
            {p.org_type && <span>{ORG_LABEL[p.org_type] || p.org_type}{p.org_domain ? ` · ${p.org_domain}` : ""}</span>}
            {p.country && <span>Country: {p.country}</span>}
          </div>
        </section>
      )}
    </main>
  );
}
