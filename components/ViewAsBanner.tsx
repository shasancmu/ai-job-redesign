"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Always-visible banner while a superadmin is viewing as another user, with a
// one-click exit back to themselves.
export default function ViewAsBanner({ email }: { email: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function exit() {
    setBusy(true);
    try {
      await fetch("/api/admin/view-as", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clear: true }),
      });
      router.push("/admin");
      router.refresh();
    } catch {
      setBusy(false);
    }
  }

  return (
    <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl border-2 border-amber bg-amber-soft px-4 py-3">
      <div className="min-w-0 text-sm text-ink">
        <span className="font-bold">Viewing as {email}</span>
        <span className="text-slate2"> · read-only lens, you can&apos;t act as them</span>
      </div>
      <button onClick={exit} disabled={busy} className="btn-dark shrink-0 text-sm">
        {busy ? "Exiting…" : "Exit"}
      </button>
    </div>
  );
}
