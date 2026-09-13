import Logo from "@/components/Logo";

// The shared "this module doesn't exist / isn't the right kind" screen for run
// routes. Server component (pure markup) so run pages can return it directly.
export default function ModuleNotFound({ title, hint }: { title: string; hint?: string }) {
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center px-6 text-center">
      <Logo />
      <h1 className="mt-6 text-xl font-bold text-ink">{title}</h1>
      {hint ? <p className="mt-2 text-sm text-slate2">{hint}</p> : null}
    </main>
  );
}
