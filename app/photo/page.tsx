"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";

export const dynamic = "force-dynamic";

// PUBLIC, no sign-in: type the code to join a live photo activity.
export default function PhotoEntry() {
  const router = useRouter();
  const [code, setCode] = useState("");

  function go(e: React.FormEvent) {
    e.preventDefault();
    const c = code.toUpperCase().replace(/[^A-Z0-9]/g, "").trim();
    if (c.length >= 4) router.push(`/photo/${c}`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-8 flex justify-center">
        <Logo />
      </div>
      <div className="card p-7">
        <h1 className="text-xl font-bold text-ink">Join the photo activity</h1>
        <p className="mt-1.5 text-sm text-slate2">Enter the code shown on the screen.</p>
        <form onSubmit={go} className="mt-5 space-y-3">
          <input
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABCDE"
            autoCapitalize="characters"
            autoComplete="off"
            className="field text-center font-mono text-2xl font-bold tracking-[0.3em]"
            maxLength={8}
          />
          <button className="btn-primary w-full" disabled={code.replace(/[^A-Za-z0-9]/g, "").length < 4}>
            Join
          </button>
        </form>
      </div>
    </main>
  );
}
