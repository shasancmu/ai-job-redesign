"use client";

// Save-as-PDF affordance for reports. Uses the browser's print dialog against
// the print stylesheet in globals.css, which hides chrome and keeps brand
// colors. Marked no-print so it never appears on the printed page itself.
export default function PrintButton({ label = "↧ Save as PDF", className }: { label?: string; className?: string }) {
  return (
    <button onClick={() => window.print()} className={(className || "btn-ghost text-sm") + " no-print"}>
      {label}
    </button>
  );
}
