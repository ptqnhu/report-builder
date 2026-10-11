import { NUMERIC } from "./constants.js";
import { pad } from "./text.js";
import { parseLocalDate, fmtDate } from "./dates.js";
import { numberSpec, formatNumber, booleanLabels, dateSpec, displayOf } from "./display.js";

/** Converts a raw value (from CSV or sample data) into the JS value for a type, or null. */
export function coerce(v, type) {
  if (v === null || v === undefined || v === "") return null;
  if (NUMERIC.has(type)) {
    if (typeof v === "number") return type === "Integer" ? Math.round(v) : v;
    let s = String(v).trim().replace(/[,\s$€£¥]/g, "");
    const pct = s.endsWith("%");
    if (pct) s = s.slice(0, -1);
    if (!/^-?\d*\.?\d+(e[-+]?\d+)?$/i.test(s)) return null;
    let n = parseFloat(s);
    if (type === "Percentage" && pct) n /= 100;
    return type === "Integer" ? Math.round(n) : n;
  }
  if (type === "Boolean") {
    if (typeof v === "boolean") return v;
    const s = String(v).trim().toLowerCase();
    if (["true", "yes", "y", "1", "t"].includes(s)) return true;
    if (["false", "no", "n", "0", "f"].includes(s)) return false;
    return null;
  }
  if (type === "Date" || type === "DateTime") {
    if (v instanceof Date) return v;
    const s = String(v).trim();
    if (!/\d{4}/.test(s) && !/\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}/.test(s)) return null;
    return parseLocalDate(s);
  }
  return String(v);
}

/** Formats a coerced value for display: the column's display option (see display.js), else the template's settings. */
export function formatValue(v, col, tpl) {
  if (v === null || v === undefined) return "";
  if (NUMERIC.has(col.type)) return formatNumber(v, numberSpec(col, tpl), tpl);
  if (col.type === "Date" || col.type === "DateTime") {
    const s = dateSpec(col, tpl);
    const time = s.time && `${pad(v.getHours())}:${pad(v.getMinutes())}${s.seconds ? `:${pad(v.getSeconds())}` : ""}`;
    return [s.date && fmtDate(v, s.date), time].filter(Boolean).join(" ");
  }
  if (col.type === "Boolean") return booleanLabels(col)[v ? 0 : 1];
  const d = displayOf(col);
  return d === "upper" ? String(v).toUpperCase() : d === "lower" ? String(v).toLowerCase() : String(v);
}

/** Sorts rows (objects keyed by column key) by one column; empty values go last. */
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
