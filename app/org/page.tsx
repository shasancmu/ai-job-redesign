import { redirect } from "next/navigation";

// Bare /org has no page of its own — send it to the branding editor.
export const metadata = { title: "Your organization" };

export default function OrgIndexPage() {
  redirect("/org/settings");
}
