// Store + hygiene for authored negotiation simulations. A Scenario (from
// lib/negotiation) is already the declarative spec — private payoff tables and
// all — so authoring is: store it, strip the hidden numbers for the client, and
// run it through the existing counterpartSystem + analyze at runtime.
import { SCENARIOS, type Scenario } from "@/lib/negotiation";
import { MODULES } from "@/lib/modules";
import { makeSpecLoader, makeCatalogLister } from "@/lib/mechanics/specStore";

// Falls back to the seeded built-in scenarios when nothing is stored for the slug.
export const getNegScenario = makeSpecLoader<Scenario>("negotiation_specs", {
  fallback: (s) => SCENARIOS.find((x) => x.slug === s) || null,
});

export type NegCatalogEntry = { slug: string; name: string; counterpart: string };
// Static-registry slugs are excluded so the two run paths never clash.
export const listNegCatalog = makeCatalogLister<NegCatalogEntry>(
  "negotiation_specs",
  (r) => ({ slug: r.slug, name: r.spec?.name || r.slug, counterpart: r.spec?.counterpartName || "" }),
  { exclude: () => new Set(MODULES.map((m) => m.slug)) },
);

// Client-safe view: strip the counterpart's private payoffs / floor. The learner
// keeps their OWN points (to optimize) and their own walk-away.
export function publicNegScenario(scn: Scenario): any {
  if (scn.kind === "multi-issue") {
    return {
      kind: "multi-issue", slug: scn.slug, name: scn.name, counterpartName: scn.counterpartName,
      youRole: scn.youRole, themRole: scn.themRole, scenario: scn.scenario, yourBatna: scn.yourBatna,
      issues: scn.issues.map((i) => ({ key: i.key, label: i.label, options: i.options.map((o) => ({ label: o.label, you: o.you })) })),
    };
  }
  return {
    kind: "single-price", slug: scn.slug, name: scn.name, counterpartName: scn.counterpartName,
    youRole: scn.youRole, themRole: scn.themRole, scenario: scn.scenario, role: scn.role,
    yourReservation: scn.yourReservation, listPrice: scn.listPrice, unit: scn.unit, item: scn.item,
  };
}

const NUM = (v: any) => typeof v === "number" && isFinite(v);
export function validateNegScenario(scn: any): string[] {
  const e: string[] = [];
  if (!scn || typeof scn !== "object") return ["Not a valid scenario object."];
  if (!scn.slug || !/^[a-z0-9-]+$/.test(scn.slug)) e.push("Give it a lowercase-with-dashes slug.");
  if (!scn.name || scn.name.length < 3) e.push("Give it a name.");
  if (!scn.counterpartName) e.push("Name the counterpart.");
  if (!scn.scenario || scn.scenario.length < 30) e.push("Write the situation the learner sees.");
  if (scn.kind === "multi-issue") {
    if (!NUM(scn.yourBatna)) e.push("Set the learner's BATNA (their walk-away score).");
    const issues = Array.isArray(scn.issues) ? scn.issues : [];
    if (issues.length < 2) e.push("A multi-issue negotiation needs at least 2 issues.");
    issues.forEach((iss: any, i: number) => {
      if (!iss.key || !iss.label) e.push(`Issue ${i + 1} needs a key and a label.`);
      const opts = Array.isArray(iss.options) ? iss.options : [];
      if (opts.length < 2) e.push(`Issue "${iss.label || i + 1}" needs at least 2 options.`);
      opts.forEach((o: any, j: number) => { if (!o.label || !NUM(o.you) || !NUM(o.them)) e.push(`Issue "${iss.label}", option ${j + 1} needs a label and numeric points for both sides.`); });
    });
    const keys = issues.map((i: any) => i.key);
    if (new Set(keys).size !== keys.length) e.push("Issue keys must be unique.");
  } else if (scn.kind === "single-price") {
    if (scn.role !== "buyer" && scn.role !== "seller") e.push("Set the learner's role to buyer or seller.");
    if (!NUM(scn.yourReservation) || !NUM(scn.theirReservation) || !NUM(scn.listPrice)) e.push("Set numeric reservation prices and a list price.");
    if (!scn.item) e.push("Name the item being negotiated.");
  } else {
    e.push('kind must be "multi-issue" or "single-price".');
  }
  return e;
}
