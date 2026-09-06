import { redirect } from "next/navigation";

// The interview builder now lives in the studio (the one authoring home).
export default function NewModuleRedirect({ searchParams }: { searchParams: { type?: string } }) {
  const q = searchParams?.type ? `?type=${encodeURIComponent(searchParams.type)}` : "";
  redirect(`/studio/interview/new${q}`);
}
