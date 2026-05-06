"use client";

/**
 * Bauhaus-geometric class badge, one glyph per archetype.
 *
 * Sits in the reserved top-right corner of every PlayerCard — the "class
 * badge." Pure geometry, single-colour. Stroke uses `currentColor` so the
 * parent chooses the hue (we default to ARCHETYPE_COLOR[archetype]).
 *
 * Glyph language:
 *   captain → chevron (leadership / rank)
 *   tech    → triangle + orb (staff + gem)
 *   sales   → coin (disc + notch)
 *   ops     → gear cross (delivery)
 *   scout   → eye (lens + pupil)
 */

import type { Archetype } from "@/lib/token-economy";
import { ARCHETYPE_COLOR, ARCHETYPE_LABEL } from "@/lib/token-economy";

type Props = {
  archetype: Archetype;
  size?: number;
  className?: string;
  /** If true, forces stroke to currentColor (parent controls hue). */
  inheritColor?: boolean;
};

export function ClassGlyph({
  archetype,
  size = 16,
  className,
  inheritColor = false,
}: Props) {
  const stroke = inheritColor ? "currentColor" : ARCHETYPE_COLOR[archetype];
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke,
    strokeWidth: 1.25,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-label": ARCHETYPE_LABEL[archetype],
    role: "img" as const,
  };

  switch (archetype) {
    case "captain":
      // Double chevron — rank / leadership
      return (
        <svg {...common} className={className}>
          <polyline points="3,7 8,3 13,7" />
          <polyline points="3,12 8,8 13,12" />
        </svg>
      );
    case "tech":
      // Triangle with orb — staff + gem
      return (
        <svg {...common} className={className}>
          <polygon points="8,3 13,13 3,13" />
          <circle cx="8" cy="9" r="1.5" fill={stroke} />
        </svg>
      );
    case "sales":
      // Coin — disc with a notch
      return (
        <svg {...common} className={className}>
          <circle cx="8" cy="8" r="5" />
          <line x1="8" y1="5" x2="8" y2="11" />
        </svg>
      );
    case "ops":
      // Gear cross — four spokes + hub
      return (
        <svg {...common} className={className}>
          <circle cx="8" cy="8" r="2.5" />
          <line x1="8" y1="1.5" x2="8" y2="4" />
          <line x1="8" y1="12" x2="8" y2="14.5" />
          <line x1="1.5" y1="8" x2="4" y2="8" />
          <line x1="12" y1="8" x2="14.5" y2="8" />
        </svg>
      );
    case "scout":
      // Eye — lens + pupil
      return (
        <svg {...common} className={className}>
          <path d="M1.5 8 Q 8 2.5 14.5 8 Q 8 13.5 1.5 8 Z" />
          <circle cx="8" cy="8" r="1.75" fill={stroke} />
        </svg>
      );
    case "fighter":
      // Star/Diamond — intense execution
      return (
        <svg {...common} className={className}>
          <path d="M8 2 L10 6 L14 8 L10 10 L8 14 L6 10 L2 8 L6 6 Z" />
          <circle cx="8" cy="8" r="1.25" fill={stroke} />
        </svg>
      );
    case "goofoff":
      // Spiral/Squiggle — wildcard
      return (
        <svg {...common} className={className}>
          <path d="M8 8 Q 12 4 8 2 Q 4 4 8 8 Q 12 12 8 14 Q 4 12 8 8" />
          <circle cx="8" cy="8" r="1.25" fill={stroke} />
        </svg>
      );
  }
}
