"use client";

/**
 * PixelSprite — adapter from the (archetype, seed, size) call-site API
 * to the static SpriteRenderer.
 *
 * Per Dr Non 2026-04-28:
 *   - tech    → WIZARD matrix
 *   - captain → SOLDIER matrix
 *   - else    → HERO matrix
 *   - primary colour swapped per stable hash of the seed (blue / red /
 *     green) so the roster shows red wizards, green soldiers, blue
 *     heroes etc.
 */

import {
  PREBAKED_CLASSES,
  primaryColorForSeed,
  spriteClassFor,
} from "@/lib/sprite-16";
import { SpriteRenderer } from "./SpriteRenderer";
import type { Archetype } from "@/lib/token-economy";

interface Props {
  archetype: Archetype;
  /** Reserved (unused). Kept for call-site compatibility. */
  gender?: "m" | "f";
  /** Display size in CSS pixels. The matrix is 16×16; scale = size / 16. */
  size?: number;
  className?: string;
  /** Stable string used to derive the primary colour. Pass the
   *  employee id so a given hero looks the same on every render. */
  seed?: string;
}

export function PixelSprite({
  archetype,
  size = 48,
  className,
  seed = "",
}: Props) {
  const cls = spriteClassFor(archetype);
  const matrix = PREBAKED_CLASSES[cls];
  const primaryColorHex = primaryColorForSeed(seed || archetype);
  const scale = Math.max(1, Math.round(size / 16));

  return (
    <div className={className}>
      <SpriteRenderer
        matrix={matrix}
        primaryColorHex={primaryColorHex}
        scale={scale}
      />
    </div>
  );
}
