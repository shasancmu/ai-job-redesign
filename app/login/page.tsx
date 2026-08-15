"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<"signin" | "signup">(
    params.get("mode") === "signup" ? "signup" : "signin"
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setBusy(true);
    const supabase = createClient();

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: name },
          emailRedirectTo: `${location.origin}/auth/callback`,
        },
      });
      if (error) {
        setErr(error.message);
        setBusy(false);
        return;
      }
      // If email confirmation is OFF, we get a session immediately.
      if (data.session) {
        await supabase.from("profiles").upsert({
          id: data.session.user.id,
          display_name: name || email.split("@")[0],
        });
        router.push("/dashboard");
        router.refresh();
        return;
      }
      setMsg("Check your email to confirm your account, then sign in.");
      setMode("signin");
      setBusy(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <Link href="/" className="mb-8 text-sm text-slate-400 hover:text-slate-600">
        ← Reimagine Your Job
      </Link>
      <h1 className="text-2xl font-bold">
        {mode === "signup" ? "Create your account" : "Sign in"}
      </h1>
      <p className="mt-1 text-slate-500">
        {mode === "signup"
          ? "You'll use this to save your redesigns."
          : "Welcome back."}
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        {mode === "signup" && (
          <div>
            <label className="lbl">Your name</label>
            <input
              className="field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Rivera"
              required
            />
          </div>
        )}
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
        <div>
          <label className="lbl">Password</label>
          <input
            className="field"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            minLength={6}
            required
          />
        </div>

        {err && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {err}
          </div>
        )}
        {msg && (
          <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            {msg}
          </div>
        )}

        <button className="btn-primary w-full" disabled={busy}>
          {busy
            ? "Working…"
            : mode === "signup"
              ? "Create account"
              : "Sign in"}
        </button>
      </form>

      <button
        onClick={() => {
          setErr(null);
          setMsg(null);
          setMode(mode === "signup" ? "signin" : "signup");
        }}
        className="mt-5 text-sm text-slate-500 hover:text-slate-800"
      >
        {mode === "signup"
          ? "Already have an account? Sign in"
          : "New here? Create an account"}
      </button>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
