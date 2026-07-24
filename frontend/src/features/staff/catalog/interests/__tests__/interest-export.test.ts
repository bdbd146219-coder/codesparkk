import { describe, expect, it } from 'vitest';
import { buildCsv, escapeCsvCell, interestLeadsFileName } from '../interest-export';

describe('escapeCsvCell', () => {
  it('passes a plain value through untouched', () => {
    expect(escapeCsvCell('Sara Ahmed')).toBe('Sara Ahmed');
    expect(escapeCsvCell(8)).toBe('8');
  });

  it('renders null / undefined as an empty field', () => {
    expect(escapeCsvCell(null)).toBe('');
    expect(escapeCsvCell(undefined)).toBe('');
  });

  it('quotes fields containing a comma, quote, or newline', () => {
    expect(escapeCsvCell('a,b')).toBe('"a,b"');
    expect(escapeCsvCell('she said "hi"')).toBe('"she said ""hi"""');
    expect(escapeCsvCell('line1\nline2')).toBe('"line1\nline2"');
  });

  it('neutralises spreadsheet formula injection (leading = + - @)', () => {
    // A phone like +20… is the common real-world trigger.
    expect(escapeCsvCell('+20 100 000 0000')).toBe("'+20 100 000 0000");
    expect(escapeCsvCell('=SUM(A1:A9)')).toBe("'=SUM(A1:A9)");
    expect(escapeCsvCell('-1+1')).toBe("'-1+1");
    expect(escapeCsvCell('@cmd')).toBe("'@cmd");
  });

  it('combines injection guard and quoting when both apply', () => {
    // Leading '=' triggers the guard; the embedded comma then forces quoting.
    expect(escapeCsvCell('=1,2')).toBe('"\'=1,2"');
  });
});

describe('buildCsv', () => {
  it('prepends a UTF-8 BOM and joins rows with CRLF', () => {
    const csv = buildCsv(['Name', 'Phone'], [['Sara', '01000000000']]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.slice(1)).toBe('Name,Phone\r\nSara,01000000000');
  });

  it('escapes every cell, header and body alike', () => {
    const csv = buildCsv(['a,b'], [['+1'], ['ok']]);
    expect(csv.slice(1)).toBe('"a,b"\r\n\'+1\r\nok');
  });
});

describe('interestLeadsFileName', () => {
  it('builds a dated, status-scoped file name', () => {
    const name = interestLeadsFileName('new', new Date('2026-07-14T08:00:00Z'));
    expect(name).toBe('interest-leads-new-2026-07-14.csv');
  });

  it('falls back to "all" for an unexpected status token', () => {
    const name = interestLeadsFileName('../etc', new Date('2026-07-14T08:00:00Z'));
    expect(name).toBe('interest-leads-all-2026-07-14.csv');
  });
});
