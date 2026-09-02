import Link from "next/link";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";

export const metadata = { title: "Terms of Service" };

// NOTE: Working draft. Have counsel review before relying on it.
export default function Terms() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Link href="/"><Logo /></Link>
        <Link href="/" className="btn-ghost text-sm">← Home</Link>
      </header>

      <h1 className="text-3xl font-bold text-ink">Terms of Service</h1>
      <p className="mt-2 text-sm text-slate-400">Last updated: {new Date().getFullYear()} · Draft for review</p>

      <div className="mt-8 space-y-6 text-slate-700 [&_a]:text-sage [&_a]:underline [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-ink">
        <section>
          <h2>The service</h2>
          <p className="mt-2 leading-relaxed">Superadditive provides AI-run exercises for work, strategy, and learning. By creating an account or using the service you agree to these terms and to our <Link href="/privacy">Privacy Policy</Link>.</p>
        </section>
        <section>
          <h2>Your account</h2>
          <p className="mt-2 leading-relaxed">You&apos;re responsible for keeping your login secure and for the content you enter. You must be old enough to form a binding contract in your country, and you may not use the service unlawfully or to harm others.</p>
        </section>
        <section>
          <h2>Your content</h2>
          <p className="mt-2 leading-relaxed">You keep ownership of what you put in and the reports you generate. You grant us the limited right to process your content to operate the service and produce your results, as described in the Privacy Policy.</p>
        </section>
        <section>
          <h2>AI outputs</h2>
          <p className="mt-2 leading-relaxed">Exercises are run by AI and are for guidance and practice. They can be wrong or incomplete, and are not professional, legal, financial, medical, or HR advice. Use your own judgment before acting on them.</p>
        </section>
        <section>
          <h2>Organizations</h2>
          <p className="mt-2 leading-relaxed">If you access Superadditive through an organization&apos;s branded space, your use may also be governed by that organization&apos;s agreement with us and their own policies.</p>
        </section>
        <section>
          <h2>Availability &amp; changes</h2>
          <p className="mt-2 leading-relaxed">We may update, suspend, or discontinue features. We&apos;ll try to give reasonable notice of material changes to these terms.</p>
        </section>
        <section>
          <h2>Disclaimers &amp; liability</h2>
          <p className="mt-2 leading-relaxed">The service is provided &ldquo;as is.&rdquo; To the extent permitted by law, we disclaim implied warranties and limit our liability for indirect or consequential losses. Nothing here limits rights that can&apos;t be limited by law.</p>
        </section>
        <section>
          <h2>Contact</h2>
          <p className="mt-2 leading-relaxed">Questions about these terms? <Link href="/contact">Contact us</Link>.</p>
        </section>
      </div>

      <div className="mt-10"><Footer /></div>
    </main>
  );
}
