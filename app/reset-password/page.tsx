"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { scorePassword } from "@/lib/passwordStrength";
import PasswordField from "@/components/PasswordField";
import Logo from "@/components/Logo";

// Reached via the reset email → /auth/callback (which set a recovery session)
// → here. The user is momentarily authenticated to set a new password.
export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState<boolean | null>(null);
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setReady(!!data.user));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!scorePassword(pw).ok) return setErr("Please choose a stronger password.");
    if (pw !== confirm) return setErr("Passwords don't match.");
    setBusy(true);
    const { error } = await createClient().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setErr(error.message);
    setDone(true);
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 900);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <Link href="/" className="mb-8"><Logo /></Link>
      <h1 className="text-2xl font-bold">Set a new password</h1>

      {ready === false ? (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          This reset link is invalid or expired. <Link href="/forgot-password" className="underline">Request a new one</Link>.
        </p>
      ) : done ? (
        <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Password updated. Taking you to your dashboard…
        </p>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          <PasswordField id="newpw" label="New password" value={pw} onChange={setPw} isNew autoComplete="new-password" autoFocus />
          <div>
            <label className="lbl" htmlFor="confirmpw">Confirm new password</label>
            <input id="confirmpw" className="field" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" autoComplete="new-password" required />
          </div>
          {err && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
          <button className="btn-primary w-full" disabled={busy || ready === null}>
            {busy ? "Updating…" : "Update password"}
          </button>
        </form>
      )}
    </main>
  );
}
