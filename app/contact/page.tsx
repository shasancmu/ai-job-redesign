import Link from "next/link";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import ContactForm from "@/components/ContactForm";

export const metadata = {
  title: "Contact",
  description: "Get in touch about bringing Superadditive to your team, program, or organization.",
};

export default function Contact({ searchParams }: { searchParams: { source?: string } }) {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Link href="/"><Logo /></Link>
        <Link href="/" className="btn-ghost text-sm">← Home</Link>
      </header>

      <h1 className="text-3xl font-bold text-ink">Get in touch</h1>
      <p className="mt-2 max-w-xl text-slate2">
        Bringing Superadditive to a team, a program, or your whole organization — or just have a question? Send us a note
        and we&apos;ll get back to you.
      </p>

      <div className="mt-8">
        <ContactForm source={searchParams.source || "contact"} />
      </div>

      <div className="mt-10"><Footer /></div>
    </main>
  );
}
