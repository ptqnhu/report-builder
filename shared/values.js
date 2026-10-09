import { NUMERIC } from "./constants.js";
import { idLike, pad } from "./text.js";
import { parseLocalDate, fmtDate } from "./dates.js";

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

/** Formats a coerced value for display using the template's settings. */
export function formatValue(v, col, tpl) {
  if (v === null || v === undefined) return "";
  const dec = Number(tpl.decimals);
  const num = (x, d) => x.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  switch (col.type) {
    case "Integer": return idLike(col.name) ? String(v) : num(v, 0);
    case "Decimal": return num(v, dec);
    case "Currency": return (v < 0 ? "-" : "") + (tpl.currency || "") + num(Math.abs(v), dec);
    case "Percentage": return num(v * 100, Math.min(dec, 2)) + "%";
    case "Date": return fmtDate(v, tpl.dateFormat);
    case "DateTime": return `${fmtDate(v, tpl.dateFormat)} ${pad(v.getHours())}:${pad(v.getMinutes())}`;
    case "Boolean": return v ? "Yes" : "No";
    default: return String(v);
  }
}
