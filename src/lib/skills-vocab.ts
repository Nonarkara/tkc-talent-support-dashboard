/**
 * Skills vocabulary — the 10 tokens that drive the Ninja Tab.
 *
 * Why a new vocabulary?
 * ─────────────────────
 * Waterfall projects in `src/lib/project-slots.ts` use a 5-value
 * `SlotDimension` (technical / sales / marketing / outsourcing /
 * paperwork) that maps 1:1 to the 5 `Archetype` tokens via the fit
 * matrix. That pairing works great for fixture-style projects where
 * you fill N slots of each dimension.
 *
 * Ninja squads work differently: the boss picks a handful of people
 * and then *asks* what skills the squad covers. The question is "does
 * this team have someone who can run procurement? do a survey? handle
 * outsourcing?" — granular, orthogonal, AND-filterable. The 5-token
 * archetype set is too blunt for that.
 *
 * So this file defines a parallel 10-token Skill set, seeded onto
 * `employees.skills[]` by migration 013. The vocabulary is closed —
 * Expedia-style toggle panels only work if the menu fits in a 2×5
 * grid, and the user stated "8–12" as the comfort range.
 *
 * Relationship to archetypes: orthogonal. An `ops` archetype might
 * carry `procurement` + `delivery_ops`; a `captain` might carry
 * `customer_success` + `sales`. Don't try to derive one from the
 * other at runtime — the migration did that once, and Phase 2 will
 * replace derived values with interview-verified ones.
 */

export type Skill =
  | "technical"
  | "sales"
  | "procurement"
  | "survey"
  | "outsourcing_mgmt"
  | "delivery_ops"
  | "finance_paperwork"
  | "marketing"
  | "customer_success"
  | "data_analysis";

/** Canonical ordering — 2 rows of 5 in the toggle panel. */
export const SKILLS: readonly Skill[] = [
  "technical",
  "sales",
  "procurement",
  "survey",
  "outsourcing_mgmt",
  "delivery_ops",
  "finance_paperwork",
  "marketing",
  "customer_success",
  "data_analysis",
] as const;

export const SKILL_LABEL: Record<Skill, string> = {
  technical: "Technical",
  sales: "Sales",
  procurement: "Procurement",
  survey: "Survey",
  outsourcing_mgmt: "Outsourcing",
  delivery_ops: "Delivery Ops",
  finance_paperwork: "Finance / Paper",
  marketing: "Marketing",
  customer_success: "Customer Success",
  data_analysis: "Data Analysis",
};

/**
 * Per-skill accent colours. Loose alignment with the existing
 * SLOT_COLOR / ARCHETYPE_COLOR palettes so nothing clashes when a
 * skill chip sits next to a project slot chip.
 */
export const SKILL_COLOR: Record<Skill, string> = {
  technical: "#4A7FB5",          // steel blue — same as SLOT_COLOR.technical
  sales: "#C44D3F",              // crimson — same as SLOT_COLOR.sales
  procurement: "#6B7A8F",        // slate — same as SLOT_COLOR.outsourcing (procurement & outsourcing read as one family)
  survey: "#2FA187",             // teal — ninja-tab-new
  outsourcing_mgmt: "#8B6FB5",   // violet — same as SLOT_COLOR.paperwork
  delivery_ops: "#5B8C4A",       // green — same as ARCHETYPE_COLOR.ops
  finance_paperwork: "#B58B3F",  // ochre — ninja-tab-new
  marketing: "#D48B3F",          // amber — same as SLOT_COLOR.marketing
  customer_success: "#D4A843",   // gold — same as ARCHETYPE_COLOR.captain
  data_analysis: "#3F7A9E",      // deep cyan — ninja-tab-new
};

/** One-line tooltip blurb — shown on toggle chip hover / in Sheets catalog. */
export const SKILL_BLURB: Record<Skill, string> = {
  technical: "Builds, fixes, and integrates the hard systems.",
  sales: "Closes the room. Turns a conversation into signed paper.",
  procurement: "Sources vendors, handles RFPs, negotiates price.",
  survey: "Research, fieldwork, analysis rigour. Asks the question properly.",
  outsourcing_mgmt: "Runs external partners so we don't have to babysit them.",
  delivery_ops: "Keeps the project shipping on the deadline the boss promised.",
  finance_paperwork: "Books, compliance, contracts, all the paper the state wants.",
  marketing: "Messaging, brand, content. Makes us findable.",
  customer_success: "After the sale — keeps the client happy so they renew.",
  data_analysis: "Turns raw logs into a chart the boss can act on.",
};

/**
 * Presets for the Expedia toggle panel. Each preset toggles a specific
 * subset on. Matches the user's "warriors ready to tackle the demon"
 * framing — pick a mission archetype, get a filtered team.
 */
export const SKILL_PRESETS: Record<string, { label: string; skills: Skill[] }> = {
  ninja: {
    label: "Default Ninja Team",
    skills: ["technical", "sales", "procurement", "survey", "outsourcing_mgmt"],
  },
  revenue: {
    label: "Revenue Squad",
    skills: ["sales", "marketing", "customer_success"],
  },
  delivery: {
    label: "Delivery Squad",
    skills: ["technical", "delivery_ops", "outsourcing_mgmt"],
  },
  insight: {
    label: "Insight Squad",
    skills: ["survey", "data_analysis", "finance_paperwork"],
  },
};

/** Default preset applied when the tab first opens. */
export const DEFAULT_NINJA_PRESET = SKILL_PRESETS.ninja;

/** Type guard for parsed strings (URL params, Sheets rows, etc.). */
export function isSkill(value: unknown): value is Skill {
  return typeof value === "string" && (SKILLS as readonly string[]).includes(value);
}

/** Narrow a raw string[] (e.g. from employees.skills) to a Skill[]. */
export function parseSkills(raw: unknown): Skill[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isSkill);
}
