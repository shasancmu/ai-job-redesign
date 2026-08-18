"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { titleCaseName } from "@/lib/name";
import Logo from "@/components/Logo";

function JoinInner() {
  const router = useRouter();
  const params = useSearchParams();
  const cohort = (params.get("cohort") || "").toUpperCase();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function go(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signInAnonymously();
    if (error || !data.user) {
      setErr(
        "Guest join isn't enabled for this workshop. Ask your facilitator, or create an account instead."
      );
      setBusy(false);
      return;
    }
    await supabase
      .from("profiles")
      .upsert({ id: data.user.id, display_name: titleCaseName(name) || "Guest" });

    const dest = cohort
      ? `/dashboard?cohort=${encodeURIComponent(cohort)}`
      : "/dashboard";
    router.push(dest);
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <Link href="/" className="mb-8">
        <Logo />
      </Link>
      <h1 className="text-2xl font-bold">Join the workshop</h1>
      <p className="mt-1 text-slate-500">
        {cohort ? (
          <>
            You&apos;re joining{" "}
            <span className="font-mono font-semibold text-slate-700">
              {cohort}
            </span>
            . No account needed, just your name.
          </>
        ) : (
          "No account needed, just your name."
        )}
      </p>

      <form onSubmit={go} className="mt-6 space-y-4">
        <div>
          <label className="lbl">Your name</label>
          <input
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alex Rivera"
            autoFocus
            required
          />
        </div>
        {err && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {err}
          </div>
        )}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? "Joining…" : "Continue"}
        </button>
      </form>

      <p className="mt-5 text-sm text-slate-400">
        Want to keep your work across sessions?{" "}
        <Link href="/login?mode=signup" className="text-slate-600 underline">
          Create an account
        </Link>{" "}
        instead.
      </p>
    </main>
  );
}

export default function JoinPage() {
  return (
    <Suspense>
      <JoinInner />
    </Suspense>
  );
}
