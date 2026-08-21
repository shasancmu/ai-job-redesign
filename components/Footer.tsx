import Link from "next/link";
import Logo from "@/components/Logo";

export default function Footer() {
  return (
    <footer className="mt-16 flex flex-wrap items-center justify-between gap-x-5 gap-y-3 border-t pt-6 text-sm text-ink/45" style={{ borderColor: "var(--line)" }}>
      <Logo size={22} />
      <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <Link href="/contact" className="hover:text-ink">Contact</Link>
        <Link href="/privacy" className="hover:text-ink">Privacy</Link>
        <Link href="/terms" className="hover:text-ink">Terms</Link>
        <Link href="/cookies" className="hover:text-ink">Cookies</Link>
        <Link href="/dpa" className="hover:text-ink">DPA</Link>
        <Link href="/sub-processors" className="hover:text-ink">Sub-processors</Link>
      </nav>
    </footer>
  );
}
