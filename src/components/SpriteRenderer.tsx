"use client";

/**
 * SpriteRenderer — exact code as supplied by Dr Non 2026-04-28.
 *
 * Do not alter the CSS grid. Do not introduce layering. Takes a static
 * 16×16 matrix and a primary colour; swaps palette[3] with the colour;
 * renders one <div> per cell.
 */

import { PALETTE, type PixelMatrix } from "@/lib/sprite-16";

interface Props {
  matrix: PixelMatrix;
  primaryColorHex?: string;
  scale?: number;
}

export const SpriteRenderer = ({
  matrix,
  primaryColorHex = "#0058F8",
  scale = 4,
}: Props) => {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(16, 1fr)",
        width: `${16 * scale}px`,
        height: `${16 * scale}px`,
        imageRendering: "pixelated",
      }}
    >
      {matrix.map((row, rowIndex) =>
        row.map((colorKey, colIndex) => {
          let cellColor = PALETTE[colorKey];
          // Dynamically inject permutations by replacing the '3' key color
          if (colorKey === 3) cellColor = primaryColorHex;

          return (
            <div
              key={`${rowIndex}-${colIndex}`}
              style={{ backgroundColor: cellColor }}
            />
          );
        }),
      )}
    </div>
  );
};
