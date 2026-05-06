"use client";

/**
 * CassetteBadge — a one-glance state indicator for any save surface.
 *
 *   <CassetteBadge state={state} lastSavedAt={lastSavedAt} queueSize={n} />
 *
 * Reads like a real cartridge: solid disc = saved, pulsing = saving,
 * amber = unsaved dirt, red = error, outline-only = queued offline.
 * No gradients, no shadows — a mono pictogram + a monospace label.
 */

import type { SaveState } from "@/lib/useCassetteSave";
import { translate, useLocale, type Locale } from "@/lib/i18n";
import { CASSETTE } from "@/lib/i18n-dict";

interface Props {
  state: SaveState;
  lastSavedAt?: number | null;
  queueSize?: number;
}

export function CassetteBadge({ state, lastSavedAt, queueSize = 0 }: Props) {
  const { loc } = useLocale();
  const { dotColor, dotFill, label } = readout(loc, state, lastSavedAt, queueSize);
  return (
    <span
      data-slot="cassette-badge"
      data-state={state}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--dq-muted-ink)",
        userSelect: "none",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 8,
          height: 8,
          border: `1px solid ${dotColor}`,
          background: dotFill,
          animation: state === "saving" ? "cassette-pulse 1s ease-in-out infinite" : "none",
        }}
      />
      <span>{label}</span>
      <style>{`@keyframes cassette-pulse{0%,100%{opacity:1}50%{opacity:.35}}`}</style>
    </span>
  );
}

function readout(
  loc: Locale,
  state: SaveState,
  lastSavedAt?: number | null,
  queueSize = 0,
) {
  switch (state) {
    case "idle":
      return {
        dotColor: "rgba(243,197,103,0.35)",
        dotFill: "transparent",
        label: translate(loc, CASSETTE.idle),
      };
    case "dirty":
      return {
        dotColor: "var(--rpg-yellow, #f3c567)",
        dotFill: "transparent",
        label: translate(loc, CASSETTE.dirty),
      };
    case "saving":
      return {
        dotColor: "var(--rpg-yellow, #f3c567)",
        dotFill: "var(--rpg-yellow, #f3c567)",
        label: translate(loc, CASSETTE.saving),
      };
    case "saved": {
      const t = lastSavedAt
        ? relativeTime(loc, lastSavedAt)
        : translate(loc, { en: "just now", th: "เมื่อสักครู่" });
      return {
        dotColor: "#5ec28a",
        dotFill: "#5ec28a",
        label: `${translate(loc, CASSETTE.saved)} · ${t}`,
      };
    }
    case "queued":
      return {
        dotColor: "#f3c567",
        dotFill: "transparent",
        label:
          queueSize > 0
            ? `${translate(loc, CASSETTE.queued)} · ${queueSize} ${translate(loc, { en: "offline", th: "ออฟไลน์" })}`
            : `${translate(loc, CASSETTE.queued)} ${translate(loc, { en: "offline", th: "ออฟไลน์" })}`,
      };
    case "error":
      return {
        dotColor: "#d45e4e",
        dotFill: "#d45e4e",
        label: `${translate(loc, CASSETTE.error)} — ${translate(loc, { en: "retry", th: "ลองใหม่" })}`,
      };
    default:
      return { dotColor: "rgba(243,197,103,0.35)", dotFill: "transparent", label: state };
  }
}

function relativeTime(loc: Locale, ts: number): string {
  const diff = Math.max(0, Date.now() - ts);
  const s = Math.round(diff / 1000);
  if (s < 5) return translate(loc, { en: "just now", th: "เมื่อสักครู่" });
  if (s < 60) return translate(loc, { en: `${s}s ago`, th: `${s} วิที่แล้ว` });
  const m = Math.round(s / 60);
  if (m < 60) return translate(loc, { en: `${m}m ago`, th: `${m} นาทีที่แล้ว` });
  const h = Math.round(m / 60);
  return translate(loc, { en: `${h}h ago`, th: `${h} ชม.ที่แล้ว` });
}
