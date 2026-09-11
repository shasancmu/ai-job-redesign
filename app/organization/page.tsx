// /organization is the sensible URL for the org console. The implementation lives
// at /team (a legacy path); this route renders the same page so both URLs work and
// the address bar reads /organization.
export { default, dynamic } from "@/app/team/page";

export const metadata = { title: "Organization" };
