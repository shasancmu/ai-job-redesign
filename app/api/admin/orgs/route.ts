import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperadmin } from "@/lib/orgs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Superadmin-only management of white-label orgs, their facilitators, and invites.
// One route, several actions, so the console has a single endpoint.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  if (!(await isSuperadmin(user))) return Response.json({ error: "Superadmin only." }, { status: 403 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const action = String(body.action || "");
  const admin = createAdminClient();

  try {
    if (action === "save_org") {
      const slug = String(body.slug || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
      const name = String(body.name || "").trim();
      if (!slug || !name) return Response.json({ error: "slug and name are required" }, { status: 400 });
      const row: any = {
        slug,
        name,
        tagline: body.tagline ? String(body.tagline).slice(0, 200) : null,
        primary_color: body.primary_color ? String(body.primary_color).slice(0, 16) : null,
        invite_only: body.invite_only !== false,
        updated_at: new Date().toISOString(),
      };
      if (body.id) {
        const { data, error } = await admin.from("organizations").update(row).eq("id", body.id).select().single();
        if (error) return Response.json({ error: error.message }, { status: 400 });
        return Response.json({ org: data });
      }
      row.owner_id = user.id;
      const { data, error } = await admin.from("organizations").insert(row).select().single();
      if (error) return Response.json({ error: error.message.includes("duplicate") ? `The slug "${slug}" is taken.` : error.message }, { status: 400 });
      return Response.json({ org: data });
    }

    if (action === "set_facilitator" || action === "add_invites") {
      const orgId = String(body.orgId || "");
      const role = action === "set_facilitator" ? "facilitator" : "member";
      const emails: string[] = (Array.isArray(body.emails) ? body.emails : [body.email])
        .map((e: any) => String(e || "").trim().toLowerCase())
        .filter((e: string) => e.includes("@"));
      if (!orgId || emails.length === 0) return Response.json({ error: "orgId and email(s) required" }, { status: 400 });
      // Record invites (claimed → membership on the user's next sign-in).
      await admin.from("org_invites").upsert(emails.map((email) => ({ org_id: orgId, email, org_role: role })), { onConflict: "org_id,email" });
      // If any invitee already has an account, add the membership immediately.
      for (let page = 1; page <= 20; page++) {
        const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        const users = data?.users || [];
        for (const u of users) {
          const em = (u.email || "").toLowerCase();
          if (emails.includes(em)) {
            await admin.from("org_members").upsert({ org_id: orgId, user_id: u.id, org_role: role }, { onConflict: "org_id,user_id" });
          }
        }
        if (users.length < 1000) break;
      }
      return Response.json({ ok: true });
    }

    if (action === "remove_invite") {
      const orgId = String(body.orgId || "");
      const email = String(body.email || "").trim().toLowerCase();
      if (!orgId || !email) return Response.json({ error: "orgId and email required" }, { status: 400 });
      await admin.from("org_invites").delete().eq("org_id", orgId).eq("email", email);
      return Response.json({ ok: true });
    }

    return Response.json({ error: "unknown action" }, { status: 400 });
  } catch (e: any) {
    return Response.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
