import { redirect } from "next/navigation";

// Living case authoring now lives in the studio (the one authoring home).
export default function NewCaseRedirect() {
  redirect("/studio/case");
}
