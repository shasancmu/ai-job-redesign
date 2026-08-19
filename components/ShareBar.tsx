"use client";

import { useEffect, useState } from "react";

// A universal share row: copy, WhatsApp, Message, Email, X, LinkedIn, and the
// device's own share sheet ("More"). `url` may be absolute or a path (it gets
// resolved against the current origin). `text` is the friendly blurb; `title`
// is used for email subject and the native share sheet.
export default function ShareBar({ url, title, text, compact }: { url: string; title: string; text: string; compact?: boolean }) {
  const [abs, setAbs] = useState(url);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    setAbs(url.startsWith("http") ? url : `${origin}${url.startsWith("/") ? "" : "/"}${url}`);
    setCanShare(typeof navigator !== "undefined" && !!(navigator as any).share);
  }, [url]);

  const blurb = `${text} ${abs}`.trim();
  const E = encodeURIComponent;
  const links = {
    whatsapp: `https://wa.me/?text=${E(blurb)}`,
    sms: `sms:?&body=${E(blurb)}`,
    email: `mailto:?subject=${E(title)}&body=${E(text + "\n\n" + abs)}`,
    x: `https://twitter.com/intent/tweet?text=${E(text)}&url=${E(abs)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${E(abs)}`,
  };

  function copy() {
    navigator.clipboard?.writeText(abs);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  async function native() {
    try { await (navigator as any).share({ title, text, url: abs }); } catch {}
  }

  const cls = "inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-mist";

  return (
    <div className={"flex flex-wrap items-center gap-2" + (compact ? "" : " ")}>
      <button onClick={copy} className={cls} title="Copy link">
        <span>{copied ? "✓" : "🔗"}</span>{copied ? "Copied" : "Copy link"}
      </button>
      <a href={links.whatsapp} target="_blank" rel="noopener noreferrer" className={cls} title="WhatsApp">
        <span style={{ color: "#25D366" }}>✆</span>WhatsApp
      </a>
      <a href={links.sms} className={cls} title="Message">💬 Message</a>
      <a href={links.email} className={cls} title="Email">✉️ Email</a>
      <a href={links.x} target="_blank" rel="noopener noreferrer" className={cls} title="Share on X">𝕏 Post</a>
      <a href={links.linkedin} target="_blank" rel="noopener noreferrer" className={cls} title="Share on LinkedIn">in LinkedIn</a>
      {canShare && <button onClick={native} className={cls} title="More sharing options">↗ More</button>}
    </div>
  );
}
