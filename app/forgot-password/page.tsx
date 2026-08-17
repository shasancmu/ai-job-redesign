"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    // The email link lands on /auth/callback, which exchanges the code for a
    // recovery session and forwards to /reset-password to set a new password.
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/callback?next=/reset-password`,
    });
    setBusy(false);
    if (error) return setErr(error.message);
    setSent(true);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <Link href="/" className="mb-8"><Logo /></Link>
      <h1 className="text-2xl font-bold">Reset your password</h1>

      {sent ? (
        <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          If an account exists for {email}, a reset link is on its way. Check your email.
        </p>
      ) : (
        <>
          <p className="mt-1 text-slate-500">We'll email you a link to set a new one.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="lbl">Email</label>
              <input
                className="field"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            {err && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
            <button className="btn-primary w-full" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</button>
          </form>
        </>
      )}

      <Link href="/login" className="mt-5 text-sm text-slate-500 hover:text-slate-800">← Back to sign in</Link>
    </main>
  );
}
