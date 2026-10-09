import { NUMERIC, idLike } from "@report-builder/shared";

export const WIDTHS = { auto: undefined, narrow: 90, medium: 160, wide: 260 };

export function sortRows(rows, sort, colsByKey) {
  if (!sort || !colsByKey[sort.key]) return rows;
  const dir = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((x, y) => {
    const a = x[sort.key], b = y[sort.key];
    if (a === null && b === null) return 0;
    if (a === null) return 1;
    if (b === null) return -1;
    if (a instanceof Date) return (a - b) * dir;
    if (typeof a === "number" || typeof a === "boolean") return (Number(a) - Number(b)) * dir;
    return String(a).localeCompare(String(b), undefined, { numeric: true }) * dir;
  });
}

/** Sum for numbers, average for percentages. Returns null when nothing is totalled. */
export function computeTotals(cols, rows) {
  const out = {};
  let any = false;
  cols.forEach((c) => {
    if (!NUMERIC.has(c.type) || idLike(c.name)) return;
    const vals = rows.map((r) => r[c.key]).filter((v) => typeof v === "number");
    if (!vals.length) return;
    const sum = vals.reduce((a, b) => a + b, 0);
    out[c.key] = c.type === "Percentage" ? { value: sum / vals.length, kind: "avg" } : { value: sum, kind: "sum" };
    any = true;
  });
  return any ? out : null;
}
