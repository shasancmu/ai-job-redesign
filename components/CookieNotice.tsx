"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// A one-time, dismissible notice. We use only essential cookies, so this
// informs rather than gates — no consent to withhold.
export default function CookieNotice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try { if (!localStorage.getItem("cookie-notice")) setShow(true); } catch {}
  }, []);

  if (!show) return null;
  const dismiss = () => { try { localStorage.setItem("cookie-notice", "1"); } catch {} setShow(false); };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] px-4 pb-4">
      <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white/95 px-4 py-3 shadow-lift backdrop-blur">
        <p className="text-sm text-slate2">
          We use only essential cookies to sign you in and run the site.{" "}
          <Link href="/cookies" className="text-sage underline">Learn more</Link>.
        </p>
        <button onClick={dismiss} className="btn-primary shrink-0 text-sm">Got it</button>
      </div>
    </div>
  );
}
