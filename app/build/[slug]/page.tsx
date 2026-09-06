import { redirect } from "next/navigation";

// The interview builder now lives in the studio (the one authoring home).
export default function EditModuleRedirect({ params }: { params: { slug: string } }) {
  redirect(`/studio/interview/${params.slug}`);
}
