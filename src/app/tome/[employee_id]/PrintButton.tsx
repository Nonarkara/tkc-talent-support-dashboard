"use client";

/**
 * PrintButton — the only client-interactive element on the Tome page.
 *
 * The Tome itself is server-rendered (heavy data, classical layout, no
 * state). This button is the single client component, hidden by the
 * print stylesheet so it never appears in the printed artifact.
 */

export function PrintButton() {
  return (
    <button
      type="button"
      className="tome-print-button no-print"
      onClick={() => window.print()}
      aria-label="Print this Tome"
    >
      Print this Tome
    </button>
  );
}
