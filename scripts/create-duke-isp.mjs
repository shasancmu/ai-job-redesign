// Create (or update) the Duke ISP organization. Idempotent.
//
// Needs SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL in .env.local (the
// service key normally lives only in Vercel — the admin console at
// /admin/orgs is the no-key alternative). Run from the repo root:
//
//   node scripts/create-duke-isp.mjs
//
// Reads env from .env.local, finds the owner by email, upserts the org with the
// deep-tech module suite, creates its master cohort, and makes the owner a director.
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const OWNER_EMAIL = "shasanx@gmail.com";
const SLUG = "duke-isp";
const MODULES = [
  "domain-brief", "find-collaborators", "licensing-brief", "score-my-invention",
  "position-my-research", "rank-disclosures", "find-a-cofounder", "diligence-the-science",
  "technology-landscape", "deep-tech-deal-sourcing", "commercialization-scorecard",
  "field-trajectory", "deeptech-canvas",
];

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
}
const url = env.NEXT_PUBLIC_SUPABASE_URL, key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"); process.exit(1); }
const db = createClient(url, key, { auth: { persistSession: false } });

let ownerId = null;
for (let page = 1; page <= 20; page++) {
  const { data } = await db.auth.admin.listUsers({ page, perPage: 1000 });
  const u = (data?.users || []).find((x) => (x.email || "").toLowerCase() === OWNER_EMAIL);
  if (u) { ownerId = u.id; break; }
  if ((data?.users || []).length < 1000) break;
}
if (!ownerId) { console.error("Owner not found:", OWNER_EMAIL); process.exit(1); }

const row = {
  slug: SLUG, name: "Duke ISP",
  tagline: "AI to manage scientific discovery and translation",
  primary_color: "#00539B", invite_only: true, member_can_browse: false,
  modules: MODULES,
  about: "The Duke ISP workspace (dukeisp.org): the deep-tech commercialization suite and the Scientifiq.AI research-intelligence tools — score discoveries, find collaborators, and map the ecosystem.",
  owner_id: ownerId, updated_at: new Date().toISOString(),
};

const { data: existing } = await db.from("organizations").select("id").eq("slug", SLUG).maybeSingle();
let org;
if (existing) { const { data, error } = await db.from("organizations").update(row).eq("id", existing.id).select().single(); if (error) throw error; org = data; console.log("Updated org", org.id); }
else { const { data, error } = await db.from("organizations").insert(row).select().single(); if (error) throw error; org = data; console.log("Created org", org.id); }

const cohortCode = ("ORG-" + org.id.replace(/-/g, "").slice(0, 10)).toUpperCase();
const { data: klass } = await db.from("classes").select("id").eq("code", cohortCode).maybeSingle();
if (!klass) { await db.from("classes").insert({ code: cohortCode, name: `${org.name} — All members`, owner_id: ownerId, org_id: org.id, is_default: true, modules: MODULES }); console.log("Created master cohort", cohortCode); }

await db.from("org_members").upsert({ org_id: org.id, user_id: ownerId, org_role: "director" }, { onConflict: "org_id,user_id" });
const { data: kl } = await db.from("classes").select("id").eq("code", cohortCode).maybeSingle();
if (kl) await db.from("class_members").upsert({ class_id: kl.id, user_id: ownerId }, { onConflict: "class_id,user_id", ignoreDuplicates: true });

console.log(`Done. ${OWNER_EMAIL} is director/owner. Visit https://superadditive.app/${SLUG}`);
