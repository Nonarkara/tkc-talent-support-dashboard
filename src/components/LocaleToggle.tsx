"use client";

/**
 * LocaleToggle — flat [EN | TH] pill for the command-center header.
 *
 * Click either side to switch; active side inverts (ink fill, paper
 * glyph). Non-looped Thai face comes from the global stack — no
 * per-component font override.
 */

import { useLocale } from "@/lib/i18n";

export function LocaleToggle() {
  const { loc, setLoc } = useLocale();
  return (
    <div
      role="group"
      aria-label="Language"
      style={{
        display: "inline-flex",
        border: "2px solid var(--sub-paper, #f5f1e8)",
        background: "var(--sub-paper, #f5f1e8)",
        marginLeft: 6,
        fontFamily: "var(--mono, monospace)",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
      }}
    >
      <button
        type="button"
        aria-pressed={loc === "en"}
        onClick={() => setLoc("en")}
        style={{
          padding: "6px 10px",
          border: 0,
          background: loc === "en" ? "var(--sub-ink, #0c0c0c)" : "var(--sub-paper, #f5f1e8)",
          color: loc === "en" ? "var(--sub-paper, #f5f1e8)" : "var(--sub-ink, #0c0c0c)",
          cursor: "pointer",
        }}
      >
        EN
      </button>
      <button
        type="button"
        aria-pressed={loc === "th"}
        onClick={() => setLoc("th")}
        style={{
          padding: "6px 10px",
          border: 0,
          background: loc === "th" ? "var(--sub-ink, #0c0c0c)" : "var(--sub-paper, #f5f1e8)",
          color: loc === "th" ? "var(--sub-paper, #f5f1e8)" : "var(--sub-ink, #0c0c0c)",
          cursor: "pointer",
        }}
      >
        TH
      </button>
    </div>
  );
}
