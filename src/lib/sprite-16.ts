/**
 * sprite-16 — pre-baked static sprite library.
 *
 * Hard-reset architecture (Dr Non 2026-04-28, last attempt):
 *   • Three pre-baked 16×16 matrices: HERO, WIZARD, SOLDIER.
 *   • Hand-plotted by Dr Non. Pasted verbatim. Never edited or
 *     "improved" by the model.
 *   • Permutations come from one mechanism only: palette[3] swap.
 *     The renderer takes a `primaryColor` and uses it for index 3
 *     (the primary cloth colour). Every other index stays constant.
 *   • Layering, compositing, accessory layers — all removed. Static
 *     matrices only.
 *
 * Class assignment:
 *   tech         → WIZARD
 *   captain      → SOLDIER
 *   everything else → HERO
 *
 * Primary-colour permutation: stable hash of the employee seed picks
 * one of three primaries (blue / red / green). A given employee always
 * renders the same colour.
 */

import type { Archetype } from "./token-economy";

// ─── Palette (expanded, Dr Non 2026-04-28) ────────────────────────────

export const PALETTE: Record<number, string> = {
  0: "transparent",
  1: "#000000", // Black Outline
  2: "#FFD1A4", // Skin Tone
  3: "#1E90FF", // Primary Swappable (Blue Armor / Purple Robe) — replaced
                //                    per agent by SpriteRenderer.primaryColorHex
  4: "#FFFFFF", // White (Blades, Beards, Cloth)
  5: "#8B4513", // Brown (Wood Staffs, Leather Shoes, Sword Hilts)
  6: "#FFD700", // Gold/Yellow (Trims, Belts, Crosses)
  7: "#A9A9A9", // Gray/Steel (Visors, Metal Accents)
  8: "#FF0000", // Red (Headbands, Accents)
};

// ─── Pre-baked matrices (Dr Non, hand-plotted) ────────────────────────

export type PixelMatrix = number[][];

export const PREBAKED_CLASSES: Record<
  "KNIGHT" | "WIZARD" | "PRIEST" | "FIGHTER",
  PixelMatrix
> = {
  KNIGHT: [
    [0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0],
    [0, 0, 1, 4, 1, 0, 0, 1, 1, 3, 3, 3, 1, 1, 0, 0],
    [0, 0, 1, 4, 1, 0, 1, 3, 3, 3, 3, 3, 3, 1, 0, 0],
    [0, 0, 1, 4, 1, 0, 1, 1, 1, 1, 1, 3, 3, 1, 0, 0],
    [0, 0, 1, 4, 1, 0, 1, 7, 7, 7, 1, 3, 3, 1, 0, 0],
    [0, 0, 1, 4, 1, 0, 1, 3, 1, 7, 1, 3, 3, 1, 0, 0],
    [0, 1, 1, 6, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0],
    [0, 1, 5, 5, 5, 1, 1, 3, 3, 3, 3, 1, 1, 1, 1, 0],
    [0, 0, 1, 5, 1, 3, 3, 3, 3, 3, 3, 3, 1, 7, 1, 0],
    [0, 0, 1, 1, 1, 3, 1, 1, 1, 1, 3, 3, 1, 3, 7, 1],
    [0, 0, 0, 0, 1, 3, 1, 6, 6, 1, 3, 1, 1, 3, 7, 1],
    [0, 0, 0, 0, 1, 3, 1, 1, 1, 1, 3, 1, 1, 3, 7, 1],
    [0, 0, 0, 0, 1, 3, 3, 1, 1, 3, 3, 1, 1, 7, 1, 0],
    [0, 0, 0, 0, 1, 3, 3, 1, 1, 3, 3, 1, 1, 1, 0, 0],
    [0, 0, 0, 0, 1, 7, 7, 1, 1, 7, 7, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
  ],
  WIZARD: [
    [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 3, 3, 3, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 1, 3, 3, 3, 3, 1, 0, 0, 0, 0, 0],
    [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
    [0, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1, 0, 0],
    [0, 1, 1, 1, 1, 2, 2, 2, 2, 2, 1, 1, 1, 1, 0, 0],
    [0, 0, 1, 5, 1, 2, 1, 2, 2, 1, 2, 1, 0, 0, 0, 0],
    [0, 0, 1, 5, 1, 4, 4, 4, 4, 4, 4, 1, 0, 0, 0, 0],
    [0, 1, 2, 5, 1, 3, 4, 4, 4, 4, 3, 1, 0, 0, 0, 0],
    [0, 1, 2, 5, 1, 3, 3, 4, 4, 3, 3, 1, 2, 1, 0, 0],
    [0, 0, 1, 5, 1, 3, 3, 3, 3, 3, 3, 1, 2, 1, 0, 0],
    [0, 0, 1, 5, 1, 3, 3, 6, 6, 3, 3, 1, 1, 0, 0, 0],
    [0, 0, 1, 5, 1, 3, 3, 3, 3, 3, 3, 1, 0, 0, 0, 0],
    [0, 0, 1, 5, 1, 3, 3, 3, 3, 3, 3, 1, 0, 0, 0, 0],
    [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0],
  ],
  PRIEST: [
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 7, 2, 2, 2, 2, 7, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 7, 1, 2, 2, 1, 7, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0],
    [0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
    [0, 0, 1, 7, 1, 4, 4, 4, 4, 4, 4, 1, 0, 0, 0, 0],
    [0, 1, 7, 7, 7, 1, 4, 3, 4, 3, 4, 1, 0, 0, 0, 0],
    [0, 1, 7, 7, 7, 1, 4, 3, 6, 3, 4, 1, 2, 1, 0, 0],
    [0, 0, 1, 5, 1, 1, 4, 3, 4, 3, 4, 1, 2, 1, 0, 0],
    [0, 0, 0, 1, 0, 1, 4, 3, 4, 3, 4, 1, 1, 0, 0, 0],
    [0, 0, 0, 1, 0, 1, 4, 3, 4, 3, 4, 1, 0, 0, 0, 0],
    [0, 0, 0, 1, 0, 1, 4, 3, 4, 3, 4, 1, 0, 0, 0, 0],
    [0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 1, 1, 1, 0, 1, 1, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ],
  FIGHTER: [
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 8, 8, 8, 8, 8, 8, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 1, 8, 0, 0, 0],
    [0, 0, 0, 0, 1, 2, 1, 2, 2, 1, 2, 1, 1, 0, 0, 0],
    [0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 1, 3, 3, 2, 2, 3, 3, 1, 1, 0, 0, 0],
    [0, 0, 1, 2, 1, 3, 3, 3, 3, 3, 3, 1, 2, 1, 0, 0],
    [0, 1, 2, 2, 1, 3, 3, 3, 3, 3, 3, 1, 2, 2, 1, 0],
    [0, 1, 1, 1, 1, 3, 3, 1, 1, 3, 3, 1, 1, 1, 1, 0],
    [0, 0, 0, 0, 1, 3, 3, 1, 1, 3, 3, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 3, 3, 1, 1, 3, 3, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 2, 2, 1, 1, 2, 2, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ],
};

export type SpriteClassName = keyof typeof PREBAKED_CLASSES;

// ─── Class assignment per archetype ───────────────────────────────────

/**
 * Map the seven archetypes onto the four sprite classes.
 *
 *   captain  → KNIGHT  (leadership)
 *   ops      → KNIGHT  (operations / warrior body)
 *   tech     → WIZARD  (digital / IT)
 *   scout    → PRIEST  (analytical / wisdom)
 *   sales    → PRIEST  (relationship / service)
 *   fighter  → FIGHTER (martial / red headband)
 *   goofoff  → FIGHTER (energetic outsider)
 */
export function spriteClassFor(archetype: Archetype): SpriteClassName {
  if (archetype === "tech") return "WIZARD";
  if (archetype === "scout" || archetype === "sales") return "PRIEST";
  if (archetype === "fighter" || archetype === "goofoff") return "FIGHTER";
  return "KNIGHT";
}

// ─── Primary colour permutation (per seed) ────────────────────────────

const PRIMARY_COLOR_OPTIONS = ["#0058F8", "#E80000", "#00A800"] as const;

function stableHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function primaryColorForSeed(seed: string): string {
  const h = stableHash(seed || "default");
  return PRIMARY_COLOR_OPTIONS[h % PRIMARY_COLOR_OPTIONS.length];
}

// Compatibility shims so any straggling import keeps building. Will be
// removed once nothing references them. Equivalent to the old single
// SpriteMatrix shape, returned per archetype using the new pipeline.
export interface SpriteMatrix {
  className: string;
  gridSize: 16;
  palette: Record<string, string>;
  pixels: number[][];
}

export function matrixForArchetype(archetype: Archetype, seed: string = ""): SpriteMatrix {
  const cls = spriteClassFor(archetype);
  const matrix = PREBAKED_CLASSES[cls];
  const primary = primaryColorForSeed(seed || archetype);
  const stringPalette: Record<string, string> = {};
  for (const k of Object.keys(PALETTE)) stringPalette[k] = PALETTE[Number(k)];
  stringPalette["3"] = primary;
  return {
    className: cls,
    gridSize: 16,
    palette: stringPalette,
    pixels: matrix.map((row) => [...row]),
  };
}
