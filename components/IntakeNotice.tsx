import Link from "next/link";

// Shown where someone who didn't sign up submits data via a shared link
// (a customer interview, a vendor disclosure). Gives them the transparency
// GDPR expects at the point of collection.
export default function IntakeNotice({ what = "Your responses" }: { what?: string }) {
  return (
    <p className="mx-auto mt-8 max-w-xl px-6 text-center text-xs leading-relaxed text-slate-400">
      {what} are collected by the organization that shared this link and processed on their behalf via Superadditive to
      produce their results. They are not used to train AI models. See how your data is handled in our{" "}
      <Link href="/privacy" className="underline hover:text-slate-600">Privacy Policy</Link>.
    </p>
  );
}
