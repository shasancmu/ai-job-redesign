import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roleFor, getOrgById, joinMasterCohort, normalizeRole } from "@/lib/orgs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Director-scoped org management. Every action is gated to an org the caller
// actually directs (or superadmin), and only ever touches that org's rows —
// this is the isolation boundary: a director can't reach another org's people.
// Directors manage members and instructors; only a superadmin makes directors.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const orgId = String(body.orgId || "");
  const role = await roleFor(user);
  const authorized = role.superadmin || role.directorOrgIds.includes(orgId);
  if (!orgId || !authorized) return Response.json({ error: "Not your organization." }, { status: 403 });

  const admin = createAdminClient();
  const action = String(body.action || "");

  try {
    if (action === "invite") {
      const wanted = body.role === "instructor" ? "instructor" : "member";
      const emails: string[] = (Array.isArray(body.emails) ? body.emails : [body.email])
        .map((e: any) => String(e || "").trim().toLowerCase())
        .filter((e: string) => e.includes("@"));
      if (!emails.length) return Response.json({ error: "Enter at least one email." }, { status: 400 });
      const org = await getOrgById(orgId);
      await admin.from("org_invites").upsert(emails.map((email) => ({ org_id: orgId, email, org_role: wanted })), { onConflict: "org_id,email" });
      // Attach immediately if the person already has an account.
      for (let page = 1; page <= 20; page++) {
        const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        const list = data?.users || [];
        for (const u of list) {
          if (emails.includes((u.email || "").toLowerCase())) {
            await admin.from("org_members").upsert({ org_id: orgId, user_id: u.id, org_role: wanted }, { onConflict: "org_id,user_id" });
            if (org) await joinMasterCohort(u.id, org);
          }
        }
        if (list.length < 1000) break;
      }
      return Response.json({ ok: true });
    }

    if (action === "set_role") {
      const userId = String(body.userId || "");
      const wanted = ["director", "instructor", "member"].includes(body.role) ? body.role : "member";
      if (!userId) return Response.json({ error: "Missing person." }, { status: 400 });
      const { data: cur } = await admin.from("org_members").select("org_role").eq("org_id", orgId).eq("user_id", userId).maybeSingle();
      if (!cur) return Response.json({ error: "Not a member of this org." }, { status: 404 });
      // A director can appoint co-directors (promote up), but changing an
      // EXISTING director (demote/remove) is superadmin-only, so directors can't
      // push each other out.
      if (normalizeRole((cur as any).org_role) === "director" && !role.superadmin) return Response.json({ error: "Only a superadmin can change a director." }, { status: 403 });
      await admin.from("org_members").update({ org_role: wanted }).eq("org_id", orgId).eq("user_id", userId);
      return Response.json({ ok: true });
    }

    if (action === "staff_link") {
      const domain = String(body.domain || "").trim().toLowerCase().replace(/^@/, "") || null;
      const token = "stf_" + Array.from(crypto.getRandomValues(new Uint8Array(16))).map((b) => b.toString(16).padStart(2, "0")).join("");
      const { error } = await admin.from("staff_invite_links").insert({ token, org_id: orgId, role: "instructor", domain, created_by: user.id });
      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ ok: true, token });
    }

    if (action === "revoke_link") {
      const token = String(body.token || "");
      if (!token) return Response.json({ error: "Missing link." }, { status: 400 });
      await admin.from("staff_invite_links").update({ active: false }).eq("token", token).eq("org_id", orgId);
      return Response.json({ ok: true });
    }

    if (action === "remove") {
      const userId = String(body.userId || "");
      if (!userId) return Response.json({ error: "Missing person." }, { status: 400 });
      const { data: cur } = await admin.from("org_members").select("org_role").eq("org_id", orgId).eq("user_id", userId).maybeSingle();
      if (cur && normalizeRole((cur as any).org_role) === "director" && !role.superadmin) return Response.json({ error: "Only a superadmin can remove a director." }, { status: 403 });
      await admin.from("org_members").delete().eq("org_id", orgId).eq("user_id", userId);
      return Response.json({ ok: true });
    }

    if (action === "remove_invite") {
      const email = String(body.email || "").trim().toLowerCase();
      if (!email) return Response.json({ error: "Missing email." }, { status: 400 });
      await admin.from("org_invites").delete().eq("org_id", orgId).eq("email", email);
      return Response.json({ ok: true });
    }

    return Response.json({ error: "unknown action" }, { status: 400 });
  } catch (e: any) {
    return Response.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
