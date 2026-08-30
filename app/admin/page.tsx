import HeaderNav from "@/components/HeaderNav";
import Logo from "@/components/Logo";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { roleFor } from "@/lib/orgs";
import ViewAsControl from "@/components/ViewAsControl";

export const dynamic = "force-dynamic";

// Admin: oversight, in one place. Your-organization tools for directors; the
// platform panel for superadmins. Keeps the account menu lean.
export default async function AdminPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const role = await roleFor(user);
  const isDirector = role.directorOrgIds.length > 0;
  if (!(role.superadmin || isDirector)) redirect("/dashboard");

  const org = [
    { icon: "🏢", title: "Organization overview", desc: "Your org's members, cohorts, and settings.", href: "/team" },
    { icon: "📊", title: "Usage", desc: "Activity for your organization's members only.", href: "/team/usage" },
    { icon: "🏅", title: "Certificates", desc: "The certificates your organization issues.", href: "/team/certificates" },
  ];
  const platform = [
    { icon: "📊", title: "Usage", desc: "Every account across the whole platform.", href: "/admin/usage" },
    { icon: "🤖", title: "AI spend & health", desc: "Token spend, errors, and latency per call.", href: "/admin/ai" },
    { icon: "💵", title: "Module unit costs", desc: "What each module costs to run.", href: "/admin/costs" },
    { icon: "🧪", title: "A/B testing", desc: "Run and adopt experiments on your AI interviews.", href: "/admin/experiments" },
    { icon: "🤖", title: "Quality Assurance", desc: "A synthetic-user persona panel runs the modules and reports what would improve each, with a Claude-Code-ready brief — the quality loop.", href: "/admin/agent" },
    { icon: "🏢", title: "Organizations", desc: "Create and manage white-label organizations.", href: "/admin/orgs" },
    { icon: "🏅", title: "Certificates", desc: "Platform-wide certificate definitions.", href: "/admin/certificates" },
    { icon: "✉️", title: "Contact messages", desc: "Feedback and messages from users.", href: "/admin/messages" },
  ];

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Logo href="/dashboard" />
        <HeaderNav />
      </header>
      <h1 className="text-2xl font-bold text-ink">Admin</h1>
      <p className="mt-1 text-sm text-slate-500">Oversee your organization and, if you own the platform, everything on it.</p>

      {isDirector && <Group title="Your organization" cards={org} />}
      {role.superadmin && <Group title="Platform" cards={platform} />}

      {role.superadmin && (
        <section className="mt-8">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Support</div>
          <ViewAsControl />
        </section>
      )}
    </main>
  );
}

function Group({ title, cards }: { title: string; cards: { icon: string; title: string; desc: string; href: string }[] }) {
  return (
    <section className="mt-8">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{title}</div>
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="group rounded-2xl border border-line bg-white p-4 transition hover:shadow-sm">
            <div className="text-2xl">{c.icon}</div>
            <div className="mt-2 text-sm font-bold text-ink group-hover:text-ai">{c.title}</div>
            <div className="mt-1 text-sm text-slate-500">{c.desc}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
