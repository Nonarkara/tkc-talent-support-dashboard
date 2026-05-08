"use client";

/**
 * DQ3HeroSprite — canvas-based procedural sprite from employee data.
 *
 * Replaces the old PixelSprite (4 static matrices × 3 colours = 12 variants)
 * with a deterministic 16×16 pixel art hero unique to every employee.
 * The canvas is 16×16 native; CSS scales to display size via image-rendering.
 */

import { useEffect, useRef, useMemo } from "react";
import { renderToCanvas, type HeroConfig } from "@/lib/dq3-sprite";
import { buildHeroForEmployee } from "@/lib/dq3-roster";
import type { Archetype } from "@/lib/token-economy";

interface Props {
  /** Employee id — seed for deterministic generation. */
  employeeId: string;
  archetype: Archetype;
  /** Optional gender override — uses 'm'/'f' from DB or 'M'/'F' from sprite system. */
  gender?: "m" | "f" | "M" | "F" | null;
  /** Display size in CSS pixels. The native canvas is 16×16. */
  size?: number;
  className?: string;
  /** When true, the sprite is rendered greyscale (for ghost/departed rows). */
  ghost?: boolean;
}

export function DQ3HeroSprite({
  employeeId,
  archetype,
  gender,
  size = 48,
  className,
  ghost = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const hero: HeroConfig = useMemo(
    () => buildHeroForEmployee(employeeId, archetype, gender),
    [employeeId, archetype, gender],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderToCanvas(canvas, hero);
  }, [hero]);

  return (
    <canvas
      ref={canvasRef}
      width={16}
      height={16}
      className={className}
      style={{
        width: size,
        height: size,
        imageRendering: "pixelated",
        filter: ghost ? "grayscale(100%) opacity(0.55)" : undefined,
      }}
    />
  );
}

/**
 * Hook to get the HeroConfig for an employee without rendering.
 * Useful for gallery inspect modals that need personality/stats data.
 */
export function useHeroConfig(
  employeeId: string,
  archetype: Archetype,
  gender?: "m" | "f" | "M" | "F" | null,
): HeroConfig {
  return useMemo(
    () => buildHeroForEmployee(employeeId, archetype, gender),
    [employeeId, archetype, gender],
  );
}
