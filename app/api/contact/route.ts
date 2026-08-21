import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const s = (v: any, n: number) => String(v ?? "").trim().slice(0, n);

// Public contact form → saved for the superadmin. Service-role insert (the table
// has RLS with no policies, so no direct client access).
export async function POST(request: Request) {
  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }

  // Honeypot: real people leave this empty; bots fill it. Silently accept.
  if (s(body.company_website, 200)) return Response.json({ ok: true });

  const email = s(body.email, 200);
  const message = s(body.message, 4000);
  if (!message || !email.includes("@")) return Response.json({ error: "Please add your email and a message." }, { status: 400 });

  let admin;
  try { admin = createAdminClient(); } catch { return Response.json({ error: "Contact isn't available right now — please try again later." }, { status: 500 }); }

  const { error } = await admin.from("contact_messages").insert({
    name: s(body.name, 120) || null,
    email,
    org: s(body.org, 160) || null,
    message,
    source: s(body.source, 60) || null,
  });
  if (error) return Response.json({ error: "Couldn't send your message. Please try again." }, { status: 500 });
  return Response.json({ ok: true });
}
