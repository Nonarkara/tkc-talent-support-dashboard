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
      className="cc-locale-toggle"
      role="group"
      aria-label="Language"
    >
      <button
        type="button"
        aria-pressed={loc === "en"}
        onClick={() => setLoc("en")}
        data-active={loc === "en" ? "true" : "false"}
      >
        EN
      </button>
      <button
        type="button"
        aria-pressed={loc === "th"}
        onClick={() => setLoc("th")}
        data-active={loc === "th" ? "true" : "false"}
      >
        TH
      </button>
    </div>
  );
}
