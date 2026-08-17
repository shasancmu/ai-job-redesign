import Logo from "@/components/Logo";

export default function Footer() {
  return (
    <footer className="mt-16 flex flex-wrap items-center justify-between gap-3 border-t pt-6 text-sm text-ink/45" style={{ borderColor: "var(--line)" }}>
      <Logo size={22} />
    </footer>
  );
}
