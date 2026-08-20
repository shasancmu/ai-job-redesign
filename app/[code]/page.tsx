import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeCode } from "@/lib/classes";
import { titleCaseName } from "@/lib/name";
import { isAdmin } from "@/lib/admin";
import { moduleBySlug, MODULES } from "@/lib/modules";
import { getOrgBySlug, type Org, type OrgHighlight, type OrgFaculty } from "@/lib/orgs";
import { enterOrg } from "./actions";
import Catalog from "@/components/Catalog";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";

export const dynamic = "force-dynamic";

export default async function CodeOrOrgPage({ params }: { params: { code: string } }) {
  // A white-label org slug (superadditive.app/duke) takes precedence over a
  // class join code — both live at the top level, org is the nicer URL.
  const org = await getOrgBySlug(params.code.trim().toLowerCase());
  if (org) return <OrgLandingView org={org} />;

  const code = normalizeCode(params.code);
  if (!code) redirect("/");

  // Read the class regardless of auth (so a signed-out visitor sees its name).
  let klass: any = null;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("classes")
      .select("id, code, name, modules, language, kind, allowed_emails")
      .eq("code", code)
      .maybeSingle();
    klass = data;
  } catch {
    /* service role not set */
  }
  if (!klass) redirect("/");

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Signed-out: invite them to create an account / sign in for THIS class.
  if (!user) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <Logo />
        <div className="mt-10">
          <div className="eyebrow">You&apos;re joining</div>
          <h1 className="mt-2 text-3xl font-bold text-ink">{klass.name}</h1>
          <p className="mt-2 text-slate2">
            Create an account (or sign in) to join this cohort. Everything you do will be part of it.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={`/login?mode=signup&next=/${code}`} className="btn-primary">
              Create an account
            </Link>
            <Link href={`/login?next=/${code}`} className="btn-ghost">
              Sign in
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Ensure a profile exists (and proper-case the name).
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) {
    await supabase.from("profiles").insert({
      id: user.id,
      display_name: titleCaseName(
        (user.user_metadata?.display_name as string) || user.email?.split("@")[0] || "You"
      ),
    });
  } else if (profile.display_name) {
    const clean = titleCaseName(profile.display_name);
    if (clean !== profile.display_name) {
      await supabase.from("profiles").update({ display_name: clean }).eq("id", user.id);
    }
  }

  // Enterprise cohorts are email-gated: only invited addresses may join.
  if (klass.kind === "enterprise") {
    const allowed: string[] = (klass.allowed_emails as any) || [];
    const email = (user.email || "").trim().toLowerCase();
    if (!allowed.includes(email)) {
      return (
        <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12 text-center">
          <Logo />
          <h1 className="mt-8 text-2xl font-bold text-ink">This cohort is invite-only</h1>
          <p className="mt-2 text-slate2">
            {klass.name} is limited to invited members. Your account ({user.email}) isn&apos;t on the list. Ask your organizer to add it.
          </p>
          <Link href="/dashboard" className="btn-primary mt-6">← Dashboard</Link>
        </main>
      );
    }
  }

  // Enroll (idempotent).
  await supabase
    .from("class_members")
    .upsert({ class_id: klass.id, user_id: user.id }, { onConflict: "class_id,user_id" });

  // Run this member's exercises in the cohort's language.
  if (klass.language && klass.language !== "English") {
    await supabase.from("profiles").update({ language: klass.language }).eq("id", user.id);
  }

  const moduleSlugs: string[] = klass.modules || [];
  const unlocked: Record<string, boolean> = {};
  for (const s of moduleSlugs) unlocked[s] = true; // class members get the class's modules

  // Completion within THIS class.
  const [{ data: mySessions }, { data: bench }, { data: net }] = await Promise.all([
    supabase
      .from("sessions")
      .select("code, exercise, status, created_at")
      .eq("cohort", code)
      .or(`host_id.eq.${user.id},guest_id.eq.${user.id}`)
      .order("created_at", { ascending: false }),
    supabase.from("benchmark_results").select("session_id").eq("user_id", user.id).eq("cohort", code).limit(1),
    supabase.from("network_responses").select("cohort").eq("user_id", user.id).eq("cohort", code).limit(1),
  ]);
  const benchmarkDone = (bench?.length || 0) > 0;
  const networkDone = (net?.length || 0) > 0;
  const completed: Record<string, boolean> = {};
  const lastCode: Record<string, string> = {};
  for (const slug of moduleSlugs) {
    const m = moduleBySlug(slug);
    if (!m) continue;
    const runs = (mySessions || []).filter((s: any) => s.exercise === m.exercise);
    if (runs[0]) lastCode[slug] = runs[0].code;
    completed[slug] =
      m.exercise === "benchmark"
        ? benchmarkDone
        : m.exercise === "network"
          ? networkDone
          : runs.some((s: any) => s.status === "done");
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between gap-3">
        <div>
          <Logo />
          <h1 className="mt-3 text-2xl font-bold text-ink">{klass.name}</h1>
          <div className="mt-0.5 font-mono text-sm text-sage">{code}</div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin(user.email) && (
            <a href={`/facilitator?cohort=${encodeURIComponent(code)}`} className="btn-ghost text-sm">
              Results
            </a>
          )}
          <form action="/auth/signout" method="post">
            <button className="btn-ghost text-sm">Sign out</button>
          </form>
        </div>
      </header>

      {moduleSlugs.length === 0 ? (
        <p className="text-slate2">Your facilitator hasn&apos;t added modules to this class yet.</p>
      ) : (
        <Catalog
          userId={user.id}
          unlocked={unlocked}
          moduleSlugs={moduleSlugs}
          fixedCohort={code}
          completed={completed}
          lastCode={lastCode}
        />
      )}

      <Footer />
    </main>
  );
}

// ---- White-label org landing (superadditive.app/{slug}) --------------------
async function OrgLandingView({ org }: { org: Org }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Signed-in: is this person allowed in (member, invited, or the org is open)?
  let allowed = false;
  let alreadyMember = false;
  if (user) {
    try {
      const admin = createAdminClient();
      const email = (user.email || "").toLowerCase();
      const { data: mem } = await admin.from("org_members").select("org_id").eq("org_id", org.id).eq("user_id", user.id).maybeSingle();
      alreadyMember = !!mem;
      allowed = alreadyMember || !org.invite_only;
      if (!allowed) {
        const { data: inv } = await admin.from("org_invites").select("org_role").eq("org_id", org.id).eq("email", email).maybeSingle();
        allowed = !!inv;
      }
    } catch { /* service role not set */ }
  }

  const accent = org.primary_color || "#3f7a52";

  // Everything below the hero is optional. Until a facilitator fills it in from
  // the console, the page shows tasteful, editable placeholder copy so it never
  // looks empty.
  const about = org.about?.trim() ||
    `A private Superadditive workspace for ${org.name}. Hands-on exercises that put AI and real business frameworks to work on the decisions your teams actually face.`;

  const highlights: OrgHighlight[] = org.highlights?.length
    ? org.highlights
    : [
        { title: "Built around your people", body: `A private space for ${org.name}. Your teams work through the exercises together, and everything they create stays inside your organization.` },
        { title: "Grounded in real frameworks", body: "Every exercise is built on established strategy, innovation, and organizational research, then run by an AI interviewer, partner, or coach." },
        { title: "Live or on your own time", body: "Facilitators open live sessions for a cohort, or people work through exercises solo. Either way, the results roll up in one place." },
      ];

  const faculty: OrgFaculty[] = org.faculty?.length
    ? org.faculty
    : [
        { name: "Faculty Lead", title: "Add your team in the console" },
        { name: "Program Facilitator" },
        { name: "Guest Expert" },
        { name: "Teaching Team" },
      ];

  // Featured module cards — the org's curated set if it has one, else a marquee
  // default. Filtered through the registry so a bad slug never renders.
  const featuredSlugs = org.modules && org.modules.length
    ? org.modules
    : ["reimagine-job", "workflow-solo", "career-x-ray", "jd-x-ray", "benchmark", "reimagine-workflow"];
  const picked = featuredSlugs.map((s) => moduleBySlug(s)).filter(Boolean) as NonNullable<ReturnType<typeof moduleBySlug>>[];
  const mods = (picked.length >= 3 ? picked : MODULES.filter((m) => !m.hidden && m.forSale !== false)).slice(0, 6);

  return (
    <main className="relative min-h-screen">
      {org.primary_color && <style dangerouslySetInnerHTML={{ __html: `:root{--brand:${org.primary_color};}` }} />}

      {/* Hero — the image dissolves into the page below instead of a hard edge. */}
      <div className="relative overflow-hidden" style={{ background: org.hero_image_url ? `center/cover no-repeat url(${org.hero_image_url})` : `linear-gradient(135deg, color-mix(in srgb, ${accent} 12%, white), white)` }}>
        {org.hero_image_url && <div className="absolute inset-0 bg-black/45" />}
        {/* Slick fade from the hero into the next section. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 sm:h-80" style={{ background: "linear-gradient(to bottom, transparent, var(--paper))" }} />
        <div className="relative mx-auto max-w-5xl px-6 pt-16 pb-56 sm:pt-24 sm:pb-80">
          <div className={"inline-flex items-center gap-2.5 " + (org.hero_image_url ? "text-white" : "text-ink")}>
            {org.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={org.logo_url} alt={org.name} style={{ height: 80, maxWidth: 360 }} className="object-contain" />
            ) : (
              <span className="text-2xl font-bold tracking-tight">{org.name}</span>
            )}
          </div>
          <h1 className={"mt-8 max-w-2xl text-4xl font-bold leading-tight sm:text-5xl " + (org.hero_image_url ? "text-white" : "text-ink")}>{org.tagline || `Welcome to ${org.name}`}</h1>
          <p className={"mt-4 max-w-xl text-lg " + (org.hero_image_url ? "text-white/85" : "text-slate2")}>
            {about}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {!user ? (
              <>
                <Link href={`/login?mode=signup&next=/${org.slug}`} className="btn-primary">Create your account</Link>
                <Link href={`/login?next=/${org.slug}`} className={org.hero_image_url ? "btn-primary bg-white/15 backdrop-blur" : "btn-ghost"}>Sign in</Link>
              </>
            ) : allowed ? (
              <form action={enterOrg.bind(null, org.slug)}>
                <button className="btn-primary">{alreadyMember ? `Continue to ${org.name} →` : `Join ${org.name} →`}</button>
              </form>
            ) : (
              <div className="rounded-xl bg-white/90 px-4 py-3 text-sm text-ink shadow-soft">
                {org.name} is invite-only. Your account ({user.email}) isn&apos;t on the list yet — ask your organizer to add it.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Institution-specific factors */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <span className="eyebrow">Why {org.name}</span>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">What your team gets here.</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {highlights.map((h, i) => (
            <div key={i} className="card p-6">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ background: accent }}>{i + 1}</span>
              <h3 className="mt-4 font-semibold text-ink">{h.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate2">{h.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Modules available */}
      <section className="mx-auto max-w-5xl px-6 pb-16">
        <span className="eyebrow">The library</span>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">Exercises available to {org.name}.</h2>
        <p className="mt-2 max-w-2xl text-slate2">
          Each is grounded in a real framework and run by an AI interviewer, partner, or coach, and ends in something you keep.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mods.map((m) => (
            <div key={m.slug} className="card flex flex-col p-5">
              <div className="text-2xl" aria-hidden>{m.emoji}</div>
              <h3 className="mt-2 font-semibold text-ink">{m.name}</h3>
              <p className="mt-1 flex-1 text-sm leading-relaxed text-slate2">
                {m.tagline.length > 128 ? m.tagline.slice(0, 125).trimEnd() + "…" : m.tagline}
              </p>
              <div className="mt-3 text-xs text-slate-400">{m.minutes} min · {m.mode}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Key faculty */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <span className="eyebrow">Your team</span>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">Faculty &amp; facilitators.</h2>
        <div className="mt-8 flex flex-wrap gap-8">
          {faculty.map((f, i) => (
            <div key={i} className="flex w-28 flex-col items-center text-center">
              {f.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.image_url} alt={f.name} className="h-20 w-20 rounded-full object-cover ring-2 ring-white shadow-soft" />
              ) : (
                <span className="flex h-20 w-20 items-center justify-center rounded-full text-lg font-bold text-white shadow-soft" style={{ background: accent }}>
                  {facultyInitials(f.name)}
                </span>
              )}
              <div className="mt-3 text-sm font-semibold text-ink">{f.name}</div>
              {f.title && <div className="mt-0.5 text-xs text-slate2">{f.title}</div>}
            </div>
          ))}
        </div>
      </section>

      <div className="border-t border-line">
        <div className="mx-auto max-w-5xl px-6 py-8 text-xs text-slate-400">
          Powered by Superadditive.
        </div>
      </div>
    </main>
  );
}

function facultyInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() || "")
      .join("") || "•"
  );
}
