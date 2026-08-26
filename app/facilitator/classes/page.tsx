import { redirect } from "next/navigation";
// Old path kept as a redirect: cohorts management moved to /facilitator/cohorts.
export const dynamic = "force-dynamic";
export default function LegacyClasses() {
  redirect("/facilitator/cohorts");
}
