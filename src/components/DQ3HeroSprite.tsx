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
  /** Display size in CSS pixels. The native canvas is 16×16. */
  size?: number;
  className?: string;
}

export function DQ3HeroSprite({
  employeeId,
  archetype,
  size = 48,
  className,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const hero: HeroConfig = useMemo(
    () => buildHeroForEmployee(employeeId, archetype),
    [employeeId, archetype],
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
      }}
    />
  );
}

/**
 * Hook to get the HeroConfig for an employee without rendering.
 * Useful for gallery inspect modals that need personality/stats data.
 */
export function useHeroConfig(employeeId: string, archetype: Archetype): HeroConfig {
  return useMemo(
    () => buildHeroForEmployee(employeeId, archetype),
    [employeeId, archetype],
  );
}
