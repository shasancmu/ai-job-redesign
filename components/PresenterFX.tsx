// Shared presentation motion for the live activities (word cloud, photo wall).
// One <style> block of cloud-* classes so both presenters animate identically.
export default function PresenterFX() {
  return (
    <style>{`
      /* Ambient aurora */
      .cloud-aurora { position: absolute; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; }
      .cloud-blob { position: absolute; border-radius: 9999px; filter: blur(90px); opacity: .13; will-change: transform; }
      .cloud-blob.b1 { width: 46vw; height: 46vw; left: -10vw; top: -12vw; background: radial-gradient(circle at 40% 40%, var(--sage), transparent 68%); animation: cloud-drift1 30s ease-in-out infinite; }
      .cloud-blob.b2 { width: 42vw; height: 42vw; right: -12vw; top: 6vh; background: radial-gradient(circle at 50% 50%, var(--sky), transparent 68%); animation: cloud-drift2 34s ease-in-out infinite; }
      .cloud-blob.b3 { width: 40vw; height: 40vw; left: 22vw; bottom: -16vw; background: radial-gradient(circle at 50% 50%, var(--amber), transparent 68%); animation: cloud-drift3 38s ease-in-out infinite; }
      @keyframes cloud-drift1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(6vw,4vh) scale(1.08); } }
      @keyframes cloud-drift2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-5vw,6vh) scale(1.1); } }
      @keyframes cloud-drift3 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(4vw,-5vh) scale(1.06); } }

      /* Primary CTA */
      .cloud-cta { background: var(--ink); }
      .cloud-cta-glow { animation: cloud-cta-glow 2.6s ease-in-out infinite; }
      @keyframes cloud-cta-glow {
        0%,100% { box-shadow: 0 12px 34px -12px rgba(20,40,58,.5), 0 0 0 0 rgba(63,122,82,0); }
        50%     { box-shadow: 0 12px 34px -12px rgba(20,40,58,.5), 0 0 34px 3px rgba(63,122,82,.28); }
      }

      /* Anticipation: live pill, heartbeat halo, ripple, count pop, dot swarm */
      .cloud-qr { animation: cloud-qr-in .6s ease both; }
      @keyframes cloud-qr-in { from { opacity: 0; transform: translateY(10px) scale(.96); } to { opacity: 1; transform: none; } }

      .cloud-livedot { width: 8px; height: 8px; border-radius: 9999px; background: #e0483b; box-shadow: 0 0 0 0 rgba(224,72,59,.5); animation: cloud-livedot 1.6s ease-in-out infinite; }
      @keyframes cloud-livedot { 0% { box-shadow: 0 0 0 0 rgba(224,72,59,.5); } 70% { box-shadow: 0 0 0 7px rgba(224,72,59,0); } 100% { box-shadow: 0 0 0 0 rgba(224,72,59,0); } }
      .cloud-livepill { animation: cloud-fade-in .5s ease both; }
      @keyframes cloud-fade-in { from { opacity: 0; } to { opacity: 1; } }

      .cloud-halo { position: absolute; width: 340px; height: 340px; border-radius: 9999px; background: radial-gradient(circle, color-mix(in srgb, var(--sage) 30%, transparent), transparent 62%); filter: blur(6px); animation: cloud-halo 2.4s ease-in-out infinite; }
      @keyframes cloud-halo { 0%,100% { transform: scale(.9); opacity: .5; } 50% { transform: scale(1.06); opacity: .85; } }
      .cloud-ripple { position: absolute; width: 150px; height: 150px; border-radius: 9999px; border: 2px solid color-mix(in srgb, var(--sky) 55%, transparent); animation: cloud-ripple 1.1s cubic-bezier(.2,.7,.25,1) forwards; }
      @keyframes cloud-ripple { 0% { transform: scale(.5); opacity: .7; } 100% { transform: scale(2.6); opacity: 0; } }
      .cloud-countpop { animation: cloud-count-pop .45s cubic-bezier(.2,.8,.2,1); }
      @keyframes cloud-count-pop { 0% { transform: scale(.86); } 55% { transform: scale(1.09); } 100% { transform: scale(1); } }

      .cloud-dot { width: 10px; height: 10px; border-radius: 9999px; animation: cloud-dot-in .5s cubic-bezier(.2,.8,.2,1) both; }
      @keyframes cloud-dot-in { 0% { opacity: 0; transform: translateY(10px) scale(0); } 60% { transform: translateY(0) scale(1.35); } 100% { opacity: .9; transform: scale(1); } }

      /* Reveal burst */
      .cloud-part { position: absolute; border-radius: 2px; opacity: 0; will-change: transform, opacity; animation-name: cloud-part; animation-timing-function: cubic-bezier(.15,.7,.3,1); animation-fill-mode: both; }
      @keyframes cloud-part { 0% { opacity: 0; transform: translate(0,0) scale(.5) rotate(0deg); } 12% { opacity: 1; } 100% { opacity: 0; transform: translate(var(--tx), var(--ty)) scale(1) rotate(var(--rot)); } }
      .cloud-flash { position: absolute; width: 120px; height: 120px; border-radius: 9999px; border: 3px solid color-mix(in srgb, var(--sage) 60%, transparent); animation: cloud-flash .7s cubic-bezier(.2,.7,.25,1) forwards; }
      @keyframes cloud-flash { 0% { opacity: .8; transform: scale(.3); } 100% { opacity: 0; transform: scale(4.6); } }

      /* Card entrance (photo wall) */
      .cloud-card { animation: cloud-card-in .6s cubic-bezier(.2,.7,.25,1) both; }
      @keyframes cloud-card-in { from { opacity: 0; transform: translateY(18px) scale(.96); } to { opacity: 1; transform: none; } }

      /* Histogram bar grow (quiz) */
      .cloud-bar { transform-origin: bottom; animation: cloud-bar .7s cubic-bezier(.2,.7,.25,1) both; }
      @keyframes cloud-bar { from { transform: scaleY(0); } to { transform: scaleY(1); } }

      /* Summary reveal */
      .cloud-rise { animation: cloud-rise .6s cubic-bezier(.2,.7,.25,1) both; }
      @keyframes cloud-rise { from { opacity: 0; transform: translateY(26px) scale(.96); } to { opacity: 1; transform: none; } }
      .cloud-sum-border { padding: 1.5px; background: linear-gradient(120deg, var(--sage), var(--sky), var(--amber), var(--sage)); background-size: 300% 100%; animation: cloud-grad 7s linear infinite; box-shadow: 0 30px 80px -30px rgba(20,40,58,.5); }
      @keyframes cloud-grad { to { background-position: 300% 0; } }
      .cloud-ai-text { background: linear-gradient(90deg, var(--sage), var(--sky), var(--amber), var(--sage)); background-size: 300% 100%; -webkit-background-clip: text; background-clip: text; color: transparent; animation: cloud-grad 6s linear infinite; }
      .cloud-ai-dot { width: 9px; height: 9px; border-radius: 9999px; background: linear-gradient(120deg, var(--sage), var(--sky)); box-shadow: 0 0 10px 1px color-mix(in srgb, var(--sky) 55%, transparent); animation: cloud-pulse 1.8s ease-in-out infinite; }
      @keyframes cloud-pulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.35); opacity: .7; } }
      .cloud-theme { animation: cloud-pop .5s cubic-bezier(.2,.7,.25,1) both; }
      @keyframes cloud-pop { from { opacity: 0; transform: translateY(14px) scale(.9); } to { opacity: 1; transform: none; } }
      .cloud-answer { animation: cloud-fade-up .7s ease both; }
      @keyframes cloud-fade-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
      .cloud-shimmer { background: linear-gradient(90deg, #eef2f7 25%, #e2e8f0 50%, #eef2f7 75%); background-size: 200% 100%; animation: cloud-shimmer 1.3s linear infinite; }
      @keyframes cloud-shimmer { to { background-position: -200% 0; } }

      @media (prefers-reduced-motion: reduce) {
        .cloud-blob, .cloud-cta-glow, .cloud-qr, .cloud-rise, .cloud-sum-border,
        .cloud-ai-text, .cloud-ai-dot, .cloud-theme, .cloud-answer, .cloud-shimmer,
        .cloud-livedot, .cloud-livepill, .cloud-halo, .cloud-ripple, .cloud-countpop,
        .cloud-dot, .cloud-part, .cloud-flash, .cloud-card, .cloud-bar { animation: none !important; }
      }
    `}</style>
  );
}
