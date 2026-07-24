/**
 * Safe, client-side CSV export for the staff interest-leads queue (C4O).
 *
 * "Safe export boundary" means two things here:
 *  - It never calls a bulk server endpoint. It exports only the rows the staff
 *    member is already looking at (the current filtered page), so no extra PII
 *    leaves the browser and the surface stays a follow-up queue, not a CRM dump.
 *  - Every cell is hardened against spreadsheet formula injection: a value that
 *    starts with `=`, `+`, `-`, `@` (or a control char) is prefixed with a
 *    single quote so Excel / Google Sheets treat it as text. Phone numbers like
 *    `+20…` are the common trigger — without this they'd be evaluated.
 */

/** Cells whose first character would make a spreadsheet evaluate them. */
const FORMULA_TRIGGER = /^[=+\-@\t\r]/;
/** Characters that force RFC-4180 quoting. */
const NEEDS_QUOTING = /["\r\n,]/;

/**
 * Escape one field for CSV: guard against formula injection first, then apply
 * RFC-4180 quoting (double any embedded quote, wrap when it contains a
 * delimiter / quote / newline).
 */
export function escapeCsvCell(value: string | number | null | undefined): string {
  const raw = value == null ? '' : String(value);
  const guarded = FORMULA_TRIGGER.test(raw) ? `'${raw}` : raw;
  if (!NEEDS_QUOTING.test(guarded)) return guarded;
  return `"${guarded.replace(/"/g, '""')}"`;
}

/**
 * Assemble a full CSV document from a header row and body rows. Uses CRLF line
 * endings (RFC 4180) and prepends a UTF-8 BOM so spreadsheet apps render the
 * Arabic columns correctly.
 */
export function buildCsv(header: readonly string[], rows: readonly (readonly string[])[]): string {
  const lines = [header, ...rows].map((cols) => cols.map(escapeCsvCell).join(','));
  return `\uFEFF${lines.join('\r\n')}`;
}

/** File-name slug for an export, e.g. `interest-leads-new-2026-07-14.csv`. */
export function interestLeadsFileName(statusFilter: string, now: Date = new Date()): string {
  const day = now.toISOString().slice(0, 10);
  const safeStatus = /^[a-z]+$/.test(statusFilter) ? statusFilter : 'all';
  return `interest-leads-${safeStatus}-${day}.csv`;
}

/**
 * Trigger a browser download of `csv` under `fileName`. Isolated from `buildCsv`
 * so the assembly logic stays pure and unit-testable; this half only runs in the
 * browser. Guarded for non-DOM (test) environments.
 */
export function downloadCsv(fileName: string, csv: string): void {
  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') return;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
