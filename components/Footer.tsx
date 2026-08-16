import { BRAND } from "@/lib/brand";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 pt-6 text-sm text-slate-400">
      <span className="font-semibold text-slate-500">{BRAND.name}</span> ·{" "}
      by{" "}
      <a href={BRAND.authorUrl} className="hover:text-slate-600" target="_blank" rel="noreferrer">
        {BRAND.author}
      </a>
    </footer>
  );
}
