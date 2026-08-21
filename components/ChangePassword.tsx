"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { scorePassword } from "@/lib/passwordStrength";
import PasswordField from "@/components/PasswordField";

// In-profile password change for signed-in users (Supabase updateUser).
export default function ChangePassword() {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    if (!scorePassword(pw).ok) return setErr("Please choose a stronger password.");
    if (pw !== confirm) return setErr("Passwords don't match.");
    setBusy(true);
    const { error } = await createClient().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setErr(error.message);
    setPw("");
    setConfirm("");
    setMsg("Password updated.");
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <PasswordField id="newpw" label="New password" value={pw} onChange={setPw} isNew autoComplete="new-password" />
        <div>
          <label className="lbl" htmlFor="confirmpw">Confirm new password</label>
          <input id="confirmpw" className="field" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="btn-ghost" disabled={busy}>{busy ? "Updating…" : "Update password"}</button>
        {msg && <span className="text-sm text-green-600">{msg}</span>}
        {err && <span className="text-sm text-red-600">{err}</span>}
      </div>
    </form>
  );
}
