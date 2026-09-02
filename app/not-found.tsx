import Link from "next/link";
import Logo from "@/components/Logo";
import ClassCodeEntry from "@/components/ClassCodeEntry";

export const metadata = { title: "Not found" };

// There was no 404 anywhere in the app. Because /[code] is a root-level
// catch-all for class codes, every unknown URL fell into it and was silently
// redirected to the marketing homepage — including a mistyped class code, which
// is the worst possible moment for it: a student in a live session, told the app
// is at superadditive.app/ABCDE, gets a sales page and no explanation.
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-lg flex-col justify-center px-6 py-16">
      <Logo href="/" />

      <h1 className="display mt-8 text-[2rem] leading-tight text-ink">We couldn&apos;t find that.</h1>
      <p className="mt-3 text-base leading-relaxed text-slate2">
        The link may be mistyped or expired. If you were joining a class or workshop, check the code
        with whoever is running it and try again here.
      </p>

      <div className="mt-6">
        <ClassCodeEntry />
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <Link href="/dashboard" className="font-semibold text-sage hover:text-ink">
          Go to your dashboard →
        </Link>
        <Link href="/" className="text-slate2 hover:text-ink">
          Back to the homepage
        </Link>
        <Link href="/contact" className="text-slate2 hover:text-ink">
          Get help
        </Link>
      </div>
    </main>
  );
}
