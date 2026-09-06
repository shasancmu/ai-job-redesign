import { redirect } from "next/navigation";

// The interview builder now lives in the studio (the one authoring home).
export default function BuildIndexRedirect() {
  redirect("/studio/interview");
}
