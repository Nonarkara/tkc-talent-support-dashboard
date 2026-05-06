/**
 * MenuWindow — the 8-bit bordered frame.
 *
 * Every Famicom RPG front-ends its data with a rectangular menu window:
 * navy fill, paper-white text, pixel-font title tab slotted into the
 * top-left corner. Dragon Quest's command window, Final Fantasy's dialog
 * frame, Fire Emblem's unit info panel — same primitive, different
 * captions.
 *
 * This component is the whole-app version of that primitive. Wrap any
 * block of UI that deserves a frame (Formation slot zone, Cockpit metric
 * tile, Signals section, Roster drawer) and it gains the signature chrome.
 * Visuals live in `.menu-window` / `.menu-window-title` in globals.css so
 * the styling is overrideable and theme-able.
 */

import type { CSSProperties, ReactNode } from "react";

type Props = {
  /** Optional title shown in the tab protruding from the top-left. */
  title?: string;
  /** Body content. */
  children: ReactNode;
  /** Extra className merged into the frame. */
  className?: string;
  /** Style override on the frame (use sparingly). */
  style?: CSSProperties;
};

export function MenuWindow({ title, children, className, style }: Props) {
  return (
    <div
      className={["menu-window", className].filter(Boolean).join(" ")}
      style={style}
    >
      {title ? <div className="menu-window-title">{title}</div> : null}
      {/* Body wrapper exists so a parent (e.g. .cc-home-window) can target
          a scroll container without touching every call site. */}
      <div className="menu-window-body">{children}</div>
    </div>
  );
}
