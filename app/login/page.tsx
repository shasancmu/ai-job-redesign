"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { titleCaseName } from "@/lib/name";
import { scorePassword } from "@/lib/passwordStrength";
import PasswordField from "@/components/PasswordField";
import Logo from "@/components/Logo";

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<"signin" | "signup">(params.get("mode") === "signup" ? "signup" : "signin");
  const [authMode, setAuthMode] = useState<"password" | "code">("password");
  const [codeSent, setCodeSent] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [consent, setConsent] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const next = params.get("next") || "/dashboard";
  const supabase = createClient();

  const creating = mode === "signup";
  const needConsent = creating && !consent;

  function reset() { setErr(null); setMsg(null); }

  async function upsertProfile(userId: string) {
    const displayName = titleCaseName(name) || email.split("@")[0];
    await supabase.from("profiles").upsert({ id: userId, display_name: displayName });
  }

  async function signInWithGoogle() {
    reset();
    if (needConsent) { setErr("Please accept the Terms and Privacy Policy first."); return; }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) { setErr(error.message); setBusy(false); }
    // On success the browser redirects to Google, so no further work here.
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    reset();
    if (creating) {
      if (!consent) { setErr("Please accept the Terms and Privacy Policy to create an account."); return; }
      if (!scorePassword(password).ok) { setErr("Please choose a stronger password."); return; }
    }
    setBusy(true);
    if (creating) {
      const cleanName = titleCaseName(name);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: cleanName, tos_accepted_at: new Date().toISOString() },
          emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) { setErr(error.message); setBusy(false); return; }
      if (data.session) { await upsertProfile(data.session.user.id); router.push(next); router.refresh(); return; }
      setMsg("Check your email to confirm your account, then sign in.");
      setMode("signin"); setBusy(false); return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setErr(error.message); setBusy(false); return; }
    router.push(next); router.refresh();
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    reset();
    if (!email) { setErr("Enter your email first."); return; }
    if (creating && !consent) { setErr("Please accept the Terms and Privacy Policy to create an account."); return; }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: creating,
        data: creating ? { display_name: titleCaseName(name), tos_accepted_at: new Date().toISOString() } : undefined,
      },
    });
    setBusy(false);
    if (error) {
      // Most common in sign-in mode when no account exists yet.
      setErr(creating ? error.message : "We couldn't send a code. If you're new, switch to Create account.");
      return;
    }
    setCodeSent(true);
    setMsg(`We sent a 6-digit code to ${email}.`);
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    reset();
    setBusy(true);
    const { data, error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: "email" });
    if (error) { setErr(error.message); setBusy(false); return; }
    if (data.user) await upsertProfile(data.user.id);
    router.push(next); router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center px-6 py-12">
      <Link href="/" className="mb-8"><Logo /></Link>
      <h1 className="text-2xl font-bold">{creating ? "Create your account" : "Sign in"}</h1>
      <p className="mt-1 text-slate-500">{creating ? "You'll use this to save your work." : "Welcome back."}</p>

      {/* Google — fastest on Android */}
      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={busy}
        className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-xl border border-line bg-white py-3 text-sm font-semibold text-ink shadow-soft transition hover:bg-mist disabled:opacity-50"
      >
        <GoogleG /> Continue with Google
      </button>

      <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
      </div>

      {creating && (
        <div className="mb-4">
          <label className="lbl" htmlFor="name">Your name</label>
          <input id="name" className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Rivera" autoComplete="name" required />
        </div>
      )}

      <div className="mb-4">
        <label className="lbl" htmlFor="email">Email</label>
        <input
          id="email"
          className="field"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoFocus={!creating}
          value={email}
          onChange={(e) => { setEmail(e.target.value); setCodeSent(false); }}
          placeholder="you@example.com"
          required
        />
      </div>

      {authMode === "password" ? (
        <form onSubmit={submitPassword} className="space-y-4">
          <PasswordField
            id="password"
            value={password}
            onChange={setPassword}
            isNew={creating}
            autoComplete={creating ? "new-password" : "current-password"}
            rightSlot={!creating ? (
              <Link href="/forgot-password" className="text-xs text-slate-400 hover:text-slate-700">Forgot password?</Link>
            ) : null}
          />
          {creating && (
            <label className="flex items-start gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--ink)]" />
              <span>I agree to the <Link href="/terms" className="text-sage underline">Terms</Link> and <Link href="/privacy" className="text-sage underline">Privacy Policy</Link>.</span>
            </label>
          )}
          <Alert err={err} msg={msg} />
          <button className="btn-primary w-full" disabled={busy || needConsent}>
            {busy ? "Working…" : creating ? "Create account" : "Sign in"}
          </button>
          <button type="button" onClick={() => { reset(); setAuthMode("code"); }} className="w-full text-center text-sm text-slate-500 hover:text-ink">
            Prefer no password? Email me a 6-digit code
          </button>
        </form>
      ) : !codeSent ? (
        <form onSubmit={sendCode} className="space-y-4">
          {creating && (
            <label className="flex items-start gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--ink)]" />
              <span>I agree to the <Link href="/terms" className="text-sage underline">Terms</Link> and <Link href="/privacy" className="text-sage underline">Privacy Policy</Link>.</span>
            </label>
          )}
          <Alert err={err} msg={msg} />
          <button className="btn-primary w-full" disabled={busy || needConsent}>{busy ? "Sending…" : "Email me a code"}</button>
          <button type="button" onClick={() => { reset(); setAuthMode("password"); }} className="w-full text-center text-sm text-slate-500 hover:text-ink">
            Use a password instead
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="space-y-4">
          <div>
            <label className="lbl" htmlFor="code">6-digit code</label>
            <input
              id="code"
              className="field text-center text-lg tracking-[0.5em]"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="••••••"
              required
            />
          </div>
          <Alert err={err} msg={msg} />
          <button className="btn-primary w-full" disabled={busy || code.length < 6}>{busy ? "Verifying…" : "Verify & continue"}</button>
          <div className="flex items-center justify-between text-sm">
            <button type="button" onClick={(e) => sendCode(e as any)} disabled={busy} className="text-slate-500 hover:text-ink">Resend code</button>
            <button type="button" onClick={() => { reset(); setCodeSent(false); setCode(""); }} className="text-slate-500 hover:text-ink">Use a different email</button>
          </div>
        </form>
      )}

      <p className="mt-5 text-center text-xs text-slate-400">
        By continuing you agree to our <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link>.
      </p>

      <button
        onClick={() => { reset(); setCodeSent(false); setMode(creating ? "signin" : "signup"); }}
        className="mt-4 text-sm text-slate-500 hover:text-slate-800"
      >
        {creating ? "Already have an account? Sign in" : "New here? Create an account"}
      </button>
    </main>
  );
}

function Alert({ err, msg }: { err: string | null; msg: string | null }) {
  if (err) return <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>;
  if (msg) return <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{msg}</div>;
  return null;
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
