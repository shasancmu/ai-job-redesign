import Link from "next/link";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";

export const metadata = { title: "Cookie Notice · Superadditive" };

export default function Cookies() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Link href="/"><Logo /></Link>
        <Link href="/privacy" className="btn-ghost text-sm">← Privacy</Link>
      </header>

      <h1 className="text-3xl font-bold text-ink">Cookie Notice</h1>
      <p className="mt-4 max-w-xl leading-relaxed text-slate-700">
        We use only <b>essential cookies</b> — the ones needed to sign you in and keep you signed in, and to remember which
        organization you&apos;re viewing. These are required for the service to work, so they don&apos;t need consent.
      </p>
      <p className="mt-4 max-w-xl leading-relaxed text-slate-700">
        We do <b>not</b> use advertising cookies, cross-site tracking, or third-party analytics that profile you. If that ever
        changes, we&apos;ll ask for your consent first and update this notice.
      </p>

      <div className="mt-8 overflow-hidden rounded-2xl border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-mist text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-4 py-3">Cookie</th><th className="px-4 py-3">Purpose</th></tr>
          </thead>
          <tbody>
            <tr className="border-t border-line"><td className="px-4 py-3 font-mono text-ink">auth session</td><td className="px-4 py-3 text-slate-700">Keeps you signed in.</td></tr>
            <tr className="border-t border-line"><td className="px-4 py-3 font-mono text-ink">active_org</td><td className="px-4 py-3 text-slate-700">Remembers which organization&apos;s space you&apos;re viewing.</td></tr>
          </tbody>
        </table>
      </div>

      <div className="mt-10"><Footer /></div>
    </main>
  );
}
