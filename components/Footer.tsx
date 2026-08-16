import Logo from "@/components/Logo";
import { BRAND } from "@/lib/brand";

export default function Footer() {
  return (
    <footer className="mt-16 flex flex-wrap items-center justify-between gap-3 border-t pt-6 text-sm text-ink/45" style={{ borderColor: "var(--line)" }}>
      <Logo size={22} />
      <span>
        by{" "}
        <a href={BRAND.authorUrl} className="text-ink/60 hover:text-sage" target="_blank" rel="noreferrer">
          {BRAND.author}
        </a>
      </span>
    </footer>
  );
}
