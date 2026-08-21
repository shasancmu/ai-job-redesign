"use client";

import { useState } from "react";
import { scorePassword } from "@/lib/passwordStrength";

// A password input with a show/hide toggle and, for new passwords, a strength
// meter + one actionable hint. Sets the right autocomplete so mobile password
// managers offer to save (new-password) or fill (current-password). Used on
// sign-up, reset, and change-password.
export default function PasswordField({
  value,
  onChange,
  label = "Password",
  isNew = false,
  autoComplete,
  placeholder = "••••••••",
  autoFocus = false,
  id,
  rightSlot,
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  isNew?: boolean; // show the strength meter and use new-password autofill
  autoComplete?: string;
  placeholder?: string;
  autoFocus?: boolean;
  id?: string;
  rightSlot?: React.ReactNode; // e.g. a "Forgot password?" link
}) {
  const [show, setShow] = useState(false);
  const s = scorePassword(value);
  const barColors = ["#e2e8f0", "#dc6b53", "#e0a53a", "#4f9d6b", "#3F7A52"];

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className="lbl" htmlFor={id}>{label}</label>
        {rightSlot}
      </div>
      <div className="relative">
        <input
          id={id}
          className="field pr-16"
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete || (isNew ? "new-password" : "current-password")}
          autoFocus={autoFocus}
          required
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-medium text-slate-400 hover:text-ink"
          aria-label={show ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>

      {isNew && value.length > 0 && (
        <div className="mt-2">
          <div className="flex gap-1" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className="h-1 flex-1 rounded-full transition-colors"
                style={{ background: i < s.score ? barColors[s.score] : "#e2e8f0" }}
              />
            ))}
          </div>
          <div className="mt-1 flex items-center justify-between gap-2 text-xs">
            <span style={{ color: barColors[s.score] }} className="font-medium">{s.label}</span>
            {s.hint && <span className="text-slate-400">{s.hint}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
