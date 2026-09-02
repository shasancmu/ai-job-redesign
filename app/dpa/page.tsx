import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { roleFor } from "@/lib/orgs";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import DpaAccept, { type DpaOrgRow } from "@/components/DpaAccept";

export const metadata = { title: "Data Processing Agreement" };
export const dynamic = "force-dynamic";

// NOTE: Working draft of a processor DPA. Have it reviewed and finalized by
// counsel (including the SCCs and the security annex) before relying on it.
export default async function DPA() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let orgs: DpaOrgRow[] = [];
  if (user) {
    const role = await roleFor(user);
    orgs = role.memberships
      .filter((m) => m.role === "director")
      .map((m) => ({ id: m.org.id, name: m.org.name, acceptedAt: m.org.dpa_accepted_at, acceptedBy: m.org.dpa_accepted_by }));
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Link href="/"><Logo /></Link>
        <Link href="/for-teams" className="btn-ghost text-sm">← For teams</Link>
      </header>

      <h1 className="text-3xl font-bold text-ink">Data Processing Agreement</h1>
      <p className="mt-2 text-sm text-slate-400">Last updated: {new Date().getFullYear()} · Draft for review</p>

      <DpaAccept orgs={orgs} />

      <div className="space-y-6 text-slate-700 [&_a]:text-sage [&_a]:underline [&_li]:mt-1 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
        <S title="1. Roles">
          This Data Processing Agreement (&ldquo;DPA&rdquo;) applies when your organization (the &ldquo;Customer&rdquo;,
          acting as <b>controller</b>) uses Superadditive (the &ldquo;Processor&rdquo;) to run exercises for your people. It
          forms part of your agreement to use the service and governs our processing of personal data on your behalf. Terms
          like &ldquo;controller&rdquo;, &ldquo;processor&rdquo;, and &ldquo;personal data&rdquo; have the meaning given in the GDPR.
        </S>
        <S title="2. Subject matter, nature & purpose, duration">
          We process personal data only to provide the service — running AI exercises, storing the resulting reports, and
          giving your directors and instructors the tools to manage their cohorts. Processing lasts for the term of your use
          of the service.
        </S>
        <S title="3. Types of data & data subjects">
          <ul>
            <li><b>Data subjects:</b> your participants — members, instructors, and directors you invite.</li>
            <li><b>Personal data:</b> names and emails; the content people enter or speak during exercises and the reports
              produced; role and cohort membership; and usage records. Please don&apos;t use the service to process special
              categories of data unless you&apos;ve confirmed a lawful basis and told your people.</li>
          </ul>
        </S>
        <S title="4. Our obligations as processor">
          <ul>
            <li>Process personal data only on your documented instructions (this DPA and your use of the service), unless
              required by law.</li>
            <li>Ensure people authorized to process the data are bound by confidentiality.</li>
            <li>Implement appropriate technical and organizational security measures (Annex A).</li>
            <li>Assist you, taking into account the nature of processing, in responding to data-subject requests and in
              meeting your obligations around security, breach notification, and data protection impact assessments.</li>
            <li>Notify you without undue delay after becoming aware of a personal-data breach.</li>
            <li>On termination, delete or return personal data at your choice, except where retention is required by law. Your
              people can also export and delete their own data from the app at any time.</li>
            <li>Make available information reasonably necessary to demonstrate compliance, and allow for audits, on
              reasonable notice and terms.</li>
          </ul>
        </S>
        <S title="5. Sub-processors">
          You give general authorization for us to use the sub-processors listed on our{" "}
          <Link href="/sub-processors">sub-processors page</Link> to provide the service. We impose data-protection terms on
          each of them equivalent to those in this DPA, and we&apos;ll update that page before adding a new sub-processor that
          processes personal data, so you can object.
        </S>
        <S title="6. International transfers">
          Where personal data is transferred outside the EEA / UK to a country without an adequacy decision, the transfer is
          covered by the Standard Contractual Clauses (or the UK equivalent) incorporated into our agreements with each
          sub-processor and, where applicable, between you and us.
        </S>
        <S title="7. Liability & precedence">
          This DPA forms part of, and is subject to, the terms of the main agreement. If there&apos;s a conflict on the
          processing of personal data, this DPA controls.
        </S>
        <S title="Annex A — Security measures (summary)">
          <ul>
            <li>Encryption of data in transit; data at rest protected by the hosting provider.</li>
            <li>Row-level access controls so each user and organization sees only their own data.</li>
            <li>Least-privilege access to production systems and secrets.</li>
            <li>Reputable sub-processors for hosting, database, AI, and payments (see the sub-processors page).</li>
            <li>Self-service data export and deletion for individuals.</li>
          </ul>
        </S>
      </div>

      <div className="mt-10"><Footer /></div>
    </main>
  );
}

function S({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      <div className="mt-2 leading-relaxed">{children}</div>
    </section>
  );
}
