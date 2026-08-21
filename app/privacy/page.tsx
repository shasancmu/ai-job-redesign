import Link from "next/link";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";

export const metadata = { title: "Privacy Policy · Superadditive" };

// NOTE: This is a working draft grounded in how the app actually processes data.
// Have it reviewed and finalized by privacy counsel before relying on it.
export default function Privacy() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Link href="/"><Logo /></Link>
        <Link href="/" className="btn-ghost text-sm">← Home</Link>
      </header>

      <h1 className="text-3xl font-bold text-ink">Privacy Policy</h1>
      <p className="mt-2 text-sm text-slate-400">Last updated: {new Date().getFullYear()} · Draft for review</p>

      <div className="prose-legal mt-8 space-y-6 text-slate-700">
        <Section title="Who we are">
          Superadditive provides AI-run exercises for work, strategy, and learning. Depending on how you use it, we act as
          the <b>data controller</b> (when you sign up and use Superadditive directly) or as a <b>data processor</b> (when
          your organization deploys a branded space and invites you — in that case your organization is the controller and
          we process data on their instructions). Contact: <a href="mailto:shasanx@gmail.com">shasanx@gmail.com</a>.
        </Section>

        <Section title="What we collect">
          <ul>
            <li><b>Account data:</b> your name and email, and account settings.</li>
            <li><b>Exercise data:</b> what you type or say during exercises — for example a résumé, business details, or your
              answers — and the reports and artifacts produced from them.</li>
            <li><b>Organization data:</b> which organizations and cohorts you belong to, and your role.</li>
            <li><b>Usage data:</b> which exercises you run and when.</li>
            <li><b>Voice:</b> for spoken exercises, your browser converts speech to text on your device; we store only the
              transcript, never an audio recording.</li>
          </ul>
        </Section>

        <Section title="How we use it, and our legal basis">
          <ul>
            <li>To provide the exercises and produce your results — <i>performance of a contract</i>.</li>
            <li>To keep the service secure and working — <i>legitimate interests</i>.</li>
            <li>To let a facilitator or organization see participation and aggregate insight for a cohort they run — on the
              organization&apos;s <i>legitimate interests</i> or your <i>consent</i>, as applicable.</li>
          </ul>
          We do not sell your data, and we do not use it to train third-party AI models.
        </Section>

        <Section title="AI processing">
          Exercises are run by AI. To generate your interview, feedback, or report, the text of your exercise is sent to our
          AI providers (see Sub-processors) purely to produce your result. Our providers process it under contract and do
          not use it to train their models. Our exercises are advisory — a human keeps the judgment — so they are not
          automated decisions with legal or similarly significant effects.
        </Section>

        <Section title="Sub-processors">
          We use vetted providers to run the service — hosting, database, AI, and payments. The current list, and what each
          does, is on our <Link href="/sub-processors">sub-processors page</Link>.
        </Section>

        <Section title="Sharing">
          We share data only with those sub-processors, with the organization that invited you (if any), and where required
          by law. Reports are private to you unless you explicitly choose to share one via a link.
        </Section>

        <Section title="International transfers">
          Some providers process data outside your country, including in the United States. Where required, these transfers
          are covered by Standard Contractual Clauses or equivalent safeguards in our agreements with each provider.
        </Section>

        <Section title="Retention">
          We keep your data while your account is active. You can delete your account at any time from your profile, which
          erases your account and its data. Where we act as a processor for an organization, retention follows their
          instructions.
        </Section>

        <Section title="Your rights">
          Subject to applicable law (including the GDPR), you can access, correct, export, delete, restrict, or object to the
          processing of your data, and withdraw consent. From <Link href="/profile">your profile</Link> you can
          <b> export your data</b> and <b>delete your account</b> yourself. For anything else, email
          <a href="mailto:shasanx@gmail.com"> shasanx@gmail.com</a>. You may also complain to your local data protection
          authority.
        </Section>

        <Section title="If someone sent you a link">
          If you were invited to answer an interview, disclosure, or survey via a link (for example a customer interview or a
          team network survey), your responses are collected on behalf of the organization or person who sent it. They are
          the controller for that data; this notice explains how the platform handles it.
        </Section>

        <Section title="Cookies">
          We use only essential cookies needed to sign you in and remember your active organization. We do not use
          advertising or cross-site tracking cookies. See our <Link href="/cookies">cookie notice</Link>.
        </Section>

        <Section title="Changes">
          We&apos;ll update this page when our practices change and revise the date above.
        </Section>
      </div>

      <div className="mt-10"><Footer /></div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      <div className="mt-2 leading-relaxed [&_a]:text-sage [&_a]:underline [&_li]:mt-1 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">{children}</div>
    </section>
  );
}
