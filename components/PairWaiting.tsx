"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Shown to the person who created the team. No dead end: they can share a code
// or a link, and if their partner created one instead, they can join it here.
export default function PairWaiting({ code }: { code: string }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [join, setJoin] = useState("");
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = `${origin}/room/${code}`;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <div className="eyebrow">Your team is open</div>
      <div className="my-4 rounded-2xl border-2 border-dashed border-line px-10 py-6">
        <div className="font-mono text-5xl font-bold tracking-[0.3em] text-ink">{code}</div>
      </div>
      <p className="max-w-sm text-slate2">
        Read this code to your partner, or drop the link in the Zoom chat and have them tap it.
      </p>
      <button
        onClick={() => {
          navigator.clipboard?.writeText(link);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="btn-ghost mt-4"
      >
        {copied ? "Link copied ✓" : "Copy invite link"}
      </button>

      <div className="mt-6 flex items-center gap-2 text-slate2">
        <span className="h-2 w-2 animate-pulse rounded-full bg-sage" />
        Waiting for your partner to join…
      </div>

      <div className="mt-8 w-full border-t border-line pt-5">
        <div className="text-sm text-slate2">Partner made the team instead?</div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const c = join.trim().toUpperCase();
            if (c.length >= 4) router.push(`/room/${c}`);
          }}
          className="mx-auto mt-2 flex max-w-xs items-center gap-2"
        >
          <input
            className="field text-center font-mono uppercase tracking-[0.3em]"
            value={join}
            onChange={(e) => setJoin(e.target.value.toUpperCase())}
            placeholder="THEIRS"
            maxLength={5}
          />
          <button className="btn-primary" disabled={join.trim().length < 4}>
            Join
          </button>
        </form>
      </div>

      <Link href="/dashboard" className="mt-8 text-sm text-slate2 hover:text-ink">
        ← Cancel
      </Link>
    </main>
  );
}
