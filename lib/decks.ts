// Server-side deck helpers. Writes use the service-role client and MATERIALIZE
// embedded activities: each live word-cloud / room-photo slide gets a real
// cloud_sessions / photo_sessions row (host = the author) with a join code, so
// presenting the slide just embeds the existing host-only present view.

import { createAdminClient } from "@/lib/supabase/admin";
import { makeCloudCode } from "@/lib/cloud";
import { slugify, validateDeck, type Deck, type Slide } from "@/lib/deckTypes";

async function uniqueCode(admin: any, table: "cloud_sessions" | "photo_sessions"): Promise<string> {
  for (let i = 0; i < 30; i++) {
    const code = makeCloudCode(5);
    const { data } = await admin.from(table).select("code").eq("code", code).maybeSingle();
    if (!data) return code;
  }
  return makeCloudCode(6);
}

// Create/refresh the underlying activity instances, returning slides with codes.
async function materialize(admin: any, userId: string, slides: Slide[]): Promise<Slide[]> {
  const out: Slide[] = [];
  for (const s of slides) {
    if (s.type === "cloud") {
      const question = (s.question || "").slice(0, 300);
      if (!s.code) {
        const code = await uniqueCode(admin, "cloud_sessions");
        await admin.from("cloud_sessions").insert({ code, host_id: userId, question });
        out.push({ ...s, code });
      } else {
        await admin.from("cloud_sessions").update({ question, updated_at: new Date().toISOString() }).eq("code", s.code).eq("host_id", userId);
        out.push(s);
      }
    } else if (s.type === "photo") {
      const prompt = (s.prompt || "").slice(0, 300);
      if (!s.code) {
        const code = await uniqueCode(admin, "photo_sessions");
        await admin.from("photo_sessions").insert({ code, host_id: userId, prompt });
        out.push({ ...s, code });
      } else {
        await admin.from("photo_sessions").update({ prompt, updated_at: new Date().toISOString() }).eq("code", s.code).eq("host_id", userId);
        out.push(s);
      }
    } else {
      out.push(s);
    }
  }
  return out;
}

async function uniqueSlug(admin: any, base: string): Promise<string> {
  for (let i = 0; i < 40; i++) {
    const cand = i === 0 ? base : `${base}-${i + 1}`;
    const { data } = await admin.from("presentations").select("slug").eq("slug", cand).maybeSingle();
    if (!data) return cand;
  }
  return `${base}-${Math.floor(Date.now() % 100000)}`;
}

export async function saveDeck(input: {
  userId: string; title: string; slides: Slide[]; orgId: string | null; status?: "draft" | "published"; editSlug?: string;
}): Promise<{ slug: string; slides: Slide[] } | { error: string }> {
  const errs = validateDeck(input.title, input.slides);
  if (errs.length) return { error: errs[0] };

  let admin;
  try { admin = createAdminClient(); } catch { return { error: "Storage is not configured." }; }

  if (input.editSlug) {
    const { data: existing } = await admin.from("presentations").select("author_id").eq("slug", input.editSlug).maybeSingle();
    if (!existing || (existing as any).author_id !== input.userId) return { error: "Not found or not yours to edit." };
  }

  const slides = await materialize(admin, input.userId, input.slides);
  const status = input.status === "draft" ? "draft" : "published";

  if (input.editSlug) {
    const { error } = await admin.from("presentations").update({
      title: input.title.slice(0, 160), slides, org_id: input.orgId, status, updated_at: new Date().toISOString(),
    }).eq("slug", input.editSlug);
    if (error) return { error: error.message };
    return { slug: input.editSlug, slides };
  }

  const slug = await uniqueSlug(admin, slugify(input.title));
  const { error } = await admin.from("presentations").insert({
    slug, title: input.title.slice(0, 160), slides, org_id: input.orgId, status, author_id: input.userId,
  });
  if (error) return { error: error.message };
  return { slug, slides };
}

export async function loadDeck(slug: string, userId: string): Promise<Deck | null> {
  let admin;
  try { admin = createAdminClient(); } catch { return null; }
  const { data } = await admin.from("presentations").select("slug, title, slides, org_id, status, author_id").eq("slug", slug).maybeSingle();
  if (!data || (data as any).author_id !== userId) return null; // decks are presented/edited by their author
  return data as any;
}

export async function listDecks(userId: string): Promise<Deck[]> {
  let admin;
  try { admin = createAdminClient(); } catch { return []; }
  const { data } = await admin.from("presentations").select("slug, title, slides, org_id, status, author_id").eq("author_id", userId).order("updated_at", { ascending: false });
  return (data || []) as any;
}
