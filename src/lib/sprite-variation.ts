/**
 * Sprite variation engine — v2 (6-slot, gender-aware).
 *
 * Deterministic per-employee recolour across six slots:
 *   hat / shirt / pants / shoes / gloves / weapon
 *
 * Why six slots. The v1 engine only swapped three glyphs (hat, cloth, wand)
 * which capped individual variety around 6×8×5 = 240 combinations. Fine for
 * a 320-person roster but the "row of clones" impression persists because
 * shoes / pants / gloves are always the archetype default. v2 pushes
 * variation into every body part so two colleagues of the same class look
 * like distinct heroes from across the map.
 *
 * Gender. Two silhouettes per archetype (m / f), five archetypes mapped to
 * DQ3 Famicom (1988) vocations: Hero (captain), Wizard (tech), Merchant
 * (sales), Soldier (ops), Pilgrim (scout). Gender is inferred from the
 * display name / title with a fail-soft Thai + English heuristic; anything
 * ambiguous falls through to a hash-based deterministic pick so the same
 * employee always renders the same sprite.
 *
 * Total variation count at six slots: 8⁶ ≈ 260k. Vastly more than needed.
 * The hash decorrelates slots so adjacent ids land on visibly different
 * sprites even within the same archetype.
 */

import type { Archetype } from "./token-economy";

// ─── Palettes — 8 entries each, Famicom-era sensibility ──────────────────

// Palettes carry DQ3 NES-era colour sensibility first (Toriyama red for
// wizard hats, Hero blue for tunics, cream for priest robes, steel grey
// for warrior helms, orange for martial-artist gi), then broader NES
// hues. Index 0 is the archetype-neutral "default-ish" colour.
export const HAT_PALETTE = [
  "#C43A2E", // ruby (Toriyama wizard)
  "#9E9E9E", // steel (warrior helm)
  "#EFE2BC", // cream (priest mitre)
  "#B8831F", // gold
  "#3E5F80", // sapphire
  "#3E6231", // emerald
  "#5E3A7A", // amethyst
  "#2A2018", // obsidian
];

export const SHIRT_PALETTE = [
  "#2B5FA0", // Hero blue tunic (default)
  "#C43A2E", // wizard red robe
  "#EFE2BC", // priest cream robe
  "#D8812A", // martial-artist orange gi
  "#8B6FB5", // plum
  "#5B8C4A", // forest
  "#D4A843", // gold
  "#5A4A3E", // slate
];

export const PANTS_PALETTE = [
  "#5A4A3E", "#3A2E24", "#2B3E5F", "#4A3E2B",
  "#3E4A3A", "#5A3E4A", "#6A5A3E", "#2A2A2A",
];

export const SHOES_PALETTE = [
  "#3D2814", "#1F1208", "#5A3A1F", "#4A2E1A",
  "#8B6F3F", "#2A2A2A", "#6A4A2E", "#3A1F0F",
];

export const GLOVES_PALETTE = [
  "#8B6F3F", "#5A4A3E", "#3A2814", "#C0C0C0",
  "#B87333", "#E8C547", "#5B8C4A", "#C44D3F",
];

export const WEAPON_PALETTE = [
  "#C0C0C0", "#E8C547", "#B87333", "#8B6F3F",
  "#9E9E9E", "#2A1E14", "#7AB8E8", "#C44D3F",
];

/** Back-compat aliases for older callers. */
export const CLOTH_PALETTE = SHIRT_PALETTE;
export const WAND_PALETTE = WEAPON_PALETTE;

export type SpriteVariation = {
  hat: number;
  shirt: number;
  pants: number;
  shoes: number;
  gloves: number;
  weapon: number;
  /** Back-compat — alias of `shirt`. Older code reads variation.cloth. */
  cloth: number;
  /** Back-compat — alias of `weapon`. */
  wand: number;
};

export type Gender = "m" | "f";

// ─── Shadow colours — auto-derived 2-tone shading ────────────────────────
//
// Each base palette gets a sibling "shadow" palette ≈25% darker, used by
// the SVG renderer to paint the shaded side of each slot without needing
// hand-placed shadow colours per sprite. Works for PNG tinting too: the
// PNG mask for `shirt_shadow` maps through this table.

function darken(hex: string, amount = 0.25): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, Math.round(((n >> 16) & 0xff) * (1 - amount)));
  const g = Math.max(0, Math.round(((n >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.round((n & 0xff) * (1 - amount)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export const HAT_SHADOW = HAT_PALETTE.map((c) => darken(c));
export const SHIRT_SHADOW = SHIRT_PALETTE.map((c) => darken(c));
export const PANTS_SHADOW = PANTS_PALETTE.map((c) => darken(c));
export const SHOES_SHADOW = SHOES_PALETTE.map((c) => darken(c, 0.35));
export const GLOVES_SHADOW = GLOVES_PALETTE.map((c) => darken(c));
export const WEAPON_SHADOW = WEAPON_PALETTE.map((c) => darken(c));

// ─── Highlights — 4-bit, SNES-era depth ──────────────────────────────────
//
// Each base palette also gets a sibling "highlight" ≈22% lighter. The
// SVG renderer uses three tones per region (light / mid / shadow) so
// pauldrons, helms and robes read as sculpted surfaces instead of flat
// shapes. This is what makes the cast feel Dragon Quest V/VI rather
// than Dragon Quest III Famicom.
function lighten(hex: string, amount = 0.22): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 0xff) + (255 - ((n >> 16) & 0xff)) * amount));
  const g = Math.min(255, Math.round(((n >> 8) & 0xff) + (255 - ((n >> 8) & 0xff)) * amount));
  const b = Math.min(255, Math.round((n & 0xff) + (255 - (n & 0xff)) * amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export const HAT_HIGHLIGHT = HAT_PALETTE.map((c) => lighten(c));
export const SHIRT_HIGHLIGHT = SHIRT_PALETTE.map((c) => lighten(c));
export const PANTS_HIGHLIGHT = PANTS_PALETTE.map((c) => lighten(c));
export const SHOES_HIGHLIGHT = SHOES_PALETTE.map((c) => lighten(c, 0.28));
export const GLOVES_HIGHLIGHT = GLOVES_PALETTE.map((c) => lighten(c));
export const WEAPON_HIGHLIGHT = WEAPON_PALETTE.map((c) => lighten(c, 0.3));

// ─── Variation key mapping ───────────────────────────────────────────────
//
// Every 32×32 sprite uses a shared glyph alphabet (see `PixelSprite.tsx`):
//   H = hat        T = shirt      P = pants
//   B = boots      G = gloves     W = weapon/staff
// No per-archetype remap any more — the six variable glyphs are the same
// across all ten sprite variants, which is what lets a single variation
// record recolour the whole cast coherently.

export const VARIATION_KEYS = {
  hat: "H",
  shirt: "T",
  pants: "P",
  shoes: "B",
  gloves: "G",
  weapon: "W",
} as const;

// ─── Hash ────────────────────────────────────────────────────────────────

export function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

/**
 * Derive the six-slot variation triple for one employee. Stable across
 * reloads. Missing id falls back to a deterministic "anon" sprite.
 */
export function getVariation(employeeId: string): SpriteVariation {
  const h = fnv1a(employeeId || "anon");
  // Independent axes: derive six moduli from different bit-slices of h.
  // Using different shifts instead of nested division keeps axes decorrelated
  // even for near-adjacent ids (UUID v4 prefixes can share leading bytes).
  const hat = h % HAT_PALETTE.length;
  const shirt = (h >>> 3) % SHIRT_PALETTE.length;
  const pants = (h >>> 7) % PANTS_PALETTE.length;
  const shoes = (h >>> 11) % SHOES_PALETTE.length;
  const gloves = (h >>> 17) % GLOVES_PALETTE.length;
  const weapon = (h >>> 23) % WEAPON_PALETTE.length;
  return { hat, shirt, pants, shoes, gloves, weapon, cloth: shirt, wand: weapon };
}

// ─── Gender inference ────────────────────────────────────────────────────
//
// No `gender` column on the employee table (privacy-by-default). We infer
// from whatever display-name parts are present. Order of precedence:
//   1) Explicit title prefix (Mr, Mrs, Ms, Miss, นาย, นาง, นางสาว)
//   2) Thai nickname patterns (common diminutives) — low-signal, deferred
//   3) Hash-based deterministic pick (so the same id always renders the
//      same silhouette even when the name gives us nothing)
//
// The function is conservative: it only returns "m" or "f" when the
// precedence rules agree. Otherwise the id-hash decides — deterministic
// but visually mixed across a large roster.

const MALE_TITLES = /^(mr\.?|นาย|master)\s/i;
const FEMALE_TITLES = /^(mrs\.?|ms\.?|miss|นาง|นางสาว|madam)\s/i;

export function inferGender(
  employeeId: string,
  fullName?: string | null,
  nickname?: string | null,
  titleEn?: string | null,
): Gender {
  const haystack = [titleEn, fullName, nickname].filter(Boolean).join(" ").trim();
  if (MALE_TITLES.test(haystack)) return "m";
  if (FEMALE_TITLES.test(haystack)) return "f";
  // Fall through: hash the id to a stable bit. Even distribution.
  return fnv1a(employeeId || "anon") & 1 ? "f" : "m";
}
