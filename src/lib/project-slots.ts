/**
 * Project slot sheets — the bill-of-materials for a project.
 *
 * Each project declares how many seats it needs per dimension. These
 * dimensions are *project-side* — what the work requires — distinct from
 * *person-archetypes* (captain/tech/sales/ops/scout) which describe who
 * someone is. Fit is the cross-product.
 *
 * Unlike priority_weights (legacy: weights summing to 10), slots are
 * absolute counts with no cap — "5G IOT wants 10 technical · 2 sales ·
 * 1 marketing · 2 outsourcing · 1 paperwork." A person filled at 100%
 * consumes one slot in the dimension they contribute to; a person at
 * 50% consumes half.
 */

export type SlotDimension =
  | "technical"
  | "sales"
  | "marketing"
  | "outsourcing"
  | "paperwork";

export const SLOT_DIMENSIONS: SlotDimension[] = [
  "technical",
  "sales",
  "marketing",
  "outsourcing",
  "paperwork",
];

export const SLOT_LABEL: Record<SlotDimension, string> = {
  technical:   "Technical",
  sales:       "Sales",
  marketing:   "Marketing",
  outsourcing: "Outsourcing",
  paperwork:   "Paperwork",
};

export const SLOT_BLURB: Record<SlotDimension, string> = {
  technical:   "Builds, architects, debugs the work itself",
  sales:       "Wins the client, holds the account",
  marketing:   "Positions, narrates, launches the story",
  outsourcing: "Procures, vendors, partner coordination",
  paperwork:   "Legal, finance, compliance, admin",
};

// Warm palette, distinct from archetype colours so project-slot views
// don't compete visually with person-archetype pentagons on the same page.
export const SLOT_COLOR: Record<SlotDimension, string> = {
  technical:   "#4A7FB5",  // steel blue
  sales:       "#C44D3F",  // crimson
  marketing:   "#D48B3F",  // amber
  outsourcing: "#6B7A8F",  // slate
  paperwork:   "#8B6FB5",  // violet
};

export type ProjectSlots = Record<SlotDimension, number>;

export function defaultProjectSlots(): ProjectSlots {
  return {
    technical:   0,
    sales:       0,
    marketing:   0,
    outsourcing: 0,
    paperwork:   0,
  };
}

export function normalizeSlots(raw: unknown): ProjectSlots {
  const out = defaultProjectSlots();
  if (!raw || typeof raw !== "object") return out;
  const obj = raw as Record<string, unknown>;
  for (const key of SLOT_DIMENSIONS) {
    const v = obj[key];
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
      out[key] = Math.round(v);
    }
  }
  return out;
}

export function slotTotal(slots: ProjectSlots): number {
  return SLOT_DIMENSIONS.reduce((acc, d) => acc + slots[d], 0);
}
