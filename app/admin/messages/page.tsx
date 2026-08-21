import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperadmin } from "@/lib/orgs";
import Logo from "@/components/Logo";
import HeaderNav from "@/components/HeaderNav";
import AdminMessages, { type ContactMessage } from "@/components/AdminMessages";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await isSuperadmin(user))) redirect("/dashboard");

  const admin = createAdminClient();
  const { data } = await admin
    .from("contact_messages")
    .select("id, name, email, org, message, source, handled, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  const messages = (data as ContactMessage[]) || [];

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Logo href="/dashboard" />
        <HeaderNav />
      </header>
      <h1 className="text-2xl font-bold text-ink">Contact messages</h1>
      <p className="mt-1 text-sm text-slate-500">Submissions from the contact form. {messages.filter((m) => !m.handled).length} new.</p>

      <div className="mt-6">
        <AdminMessages messages={messages} />
      </div>
    </main>
  );
}
