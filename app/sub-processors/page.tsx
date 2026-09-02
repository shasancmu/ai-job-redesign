import Link from "next/link";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";

export const metadata = { title: "Sub-processors" };

// NOTE: Keep this list accurate. Confirm each provider and region, and that a
// signed DPA (with SCCs for transfers) is on file, with counsel.
const SUBS = [
  { name: "Supabase", role: "Database, authentication, and file storage", where: "United States / EU (project region)" },
  { name: "Vercel", role: "Application hosting and delivery", where: "United States / global edge" },
  { name: "Anthropic", role: "AI that runs the exercises (interviews, feedback, reports)", where: "United States" },
  { name: "OpenAI", role: "AI fallback for some exercises, where configured", where: "United States" },
  { name: "Stripe", role: "Payment processing (for paid plans)", where: "United States / global" },
  { name: "Google Cloud (BigQuery)", role: "Reference datasets for science-commercialization exercises", where: "United States" },
];

export default function SubProcessors() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Link href="/"><Logo /></Link>
        <Link href="/privacy" className="btn-ghost text-sm">← Privacy</Link>
      </header>

      <h1 className="text-3xl font-bold text-ink">Sub-processors</h1>
      <p className="mt-2 max-w-xl text-slate2">
        The providers we use to run Superadditive. Each processes data only to provide its service, under contract, and does
        not use your data to train its own models.
      </p>

      <div className="mt-8 overflow-hidden rounded-2xl border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-mist text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-4 py-3">Provider</th><th className="px-4 py-3">What it does</th><th className="px-4 py-3">Where</th></tr>
          </thead>
          <tbody>
            {SUBS.map((s) => (
              <tr key={s.name} className="border-t border-line">
                <td className="px-4 py-3 font-semibold text-ink">{s.name}</td>
                <td className="px-4 py-3 text-slate-700">{s.role}</td>
                <td className="px-4 py-3 text-slate-500">{s.where}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-sm text-slate-400">We&apos;ll update this list before adding a new provider that processes personal data.</p>

      <div className="mt-10"><Footer /></div>
    </main>
  );
}
