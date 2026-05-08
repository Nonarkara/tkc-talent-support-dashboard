// PDPA: every UI surface shows the given name only.
// Family names stay in the database for HR continuity, but never reach
// the rendered page, the print-out, or the AI prompt context.
//
// Splits on whitespace — works for both English ("Sayam Tiewtranon" → "Sayam")
// and Thai ("สายัณห์ ทิวธรานนท์" → "สายัณห์").

export function firstName(input: string | null | undefined): string {
  if (!input) return "";
  const trimmed = input.trim();
  if (!trimmed) return "";
  return trimmed.split(/\s+/)[0] ?? "";
}

// Convenience for "either of these" with first-name redaction applied to the result.
export function pickFirstName(
  ...candidates: Array<string | null | undefined>
): string {
  for (const c of candidates) {
    const fn = firstName(c);
    if (fn) return fn;
  }
  return "";
}
