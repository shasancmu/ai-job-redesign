import { redirect, notFound } from "next/navigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Friendly shortcut. The Problem Hunt now runs as a real directory module (a
// session at /room/[code]), so /hunt/<mode> just kicks off the standard start
// flow for the matching module and lands you in the room.
const SLUG: Record<string, string> = { seller: "find-problem", leader: "find-org-problems" };

export default function HuntShortcut({ params }: { params: { mode: string } }) {
  const slug = SLUG[params.mode];
  if (!slug) notFound();
  redirect(`/start/${slug}`);
}
