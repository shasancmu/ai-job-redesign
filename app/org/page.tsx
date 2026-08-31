import { redirect } from "next/navigation";

// Bare /org has no page of its own — send it to the branding editor.
export default function OrgIndexPage() {
  redirect("/org/settings");
}
