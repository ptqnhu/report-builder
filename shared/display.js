import { DATE_FORMATS } from "./constants.js";
import { idLike } from "./text.js";

/**
 * How a column's values are shown in the report, chosen per column on the Columns step and saved in the template
 * (tpl.cols[name].display). "auto" follows the template's Formats (currency, decimals, date format).
 * Options per type: [id, name]. The Columns step shows each with an example made from the column's own data.
 */
export const DISPLAY_OPTIONS = {
  Text: [["auto", "As written"], ["upper", "UPPERCASE"], ["lower", "lowercase"]],
  Integer: [["auto", "Default"], ["n0", "Thousands separators"], ["plain", "No separators"], ["k", "In thousands (K)"], ["m", "In millions (M)"]],
  Decimal: [["auto", "Default"], ["n0", "No decimals"], ["n1", "1 decimal"], ["n2", "2 decimals"], ["n3", "3 decimals"], ["n4", "4 decimals"], ["k", "In thousands (K)"], ["m", "In millions (M)"]],
  Currency: [["auto", "Default"], ["n0", "No decimals"], ["n2", "2 decimals"], ["paren", "Negatives in brackets"], ["k", "In thousands (K)"], ["m", "In millions (M)"]],
  Percentage: [["auto", "Default"], ["p0", "No decimals"], ["p1", "1 decimal"], ["p2", "2 decimals"], ["ratio", "As a decimal"]],
  Date: [["auto", "Default"], ...DATE_FORMATS.map((f) => [f, f]), ["MMM YYYY", "Month and year"]],
  DateTime: [["auto", "Date and time"], ["seconds", "Date and time with seconds"], ["date", "Date only"], ["time", "Time only"], ["timesec", "Time only with seconds"]],
  Boolean: [["auto", "Yes / No"], ["tf", "True / False"], ["yn", "Y / N"], ["check", "✓ / blank"]],
};

/** The column's display option, or "auto" if it isn't one its type offers (e.g. after a type change). */
export const displayOf = (c) => ((DISPLAY_OPTIONS[c.type] || []).some((o) => o[0] === c.display) ? c.display : "auto");

/**
 * How a number column is written: { dec, group, scale, suffix, currency, parens, pct }.
 * Shared by the preview (formatNumber) and the .rdl (its .NET format string), so both agree.
 */
export function numberSpec(c, tpl) {
  const d = displayOf(c);
  const s = { dec: Number(tpl.decimals) || 0, group: true, scale: 1, suffix: "", currency: c.type === "Currency", parens: false, pct: false };
  if (c.type === "Integer") { s.dec = 0; if (d === "auto" && idLike(c.name)) s.group = false; }
  if (c.type === "Percentage") Object.assign(s, { pct: true, group: false, dec: Math.min(s.dec, 2) });
  if (/^[np]\d$/.test(d)) s.dec = Number(d[1]);
  if (d === "plain") s.group = false;
  if (d === "k" || d === "m") Object.assign(s, { dec: 1, scale: d === "k" ? 1e3 : 1e6, suffix: d.toUpperCase() });
  if (d === "paren") Object.assign(s, { parens: true, dec: 2 });
  if (d === "ratio") Object.assign(s, { pct: false, dec: 4 });
  return s;
}

/** A number written per numberSpec, e.g. "$1,234.50", "($12.00)", "1.2K", "15.25%". */
export function formatNumber(v, s, tpl) {
  const x = s.pct ? v * 100 : v / s.scale;
  const t = Math.abs(x).toLocaleString("en-US", { minimumFractionDigits: s.dec, maximumFractionDigits: s.dec, useGrouping: s.group });
  const out = (s.currency ? tpl.currency || "" : "") + t + s.suffix + (s.pct ? "%" : "");
  if (x >= 0 || /^[0.,]+$/.test(t)) return out; // nothing left after rounding: no minus sign
  return s.parens ? `(${out})` : `-${out}`;
}

/** Labels for true and false. */
export function booleanLabels(c) {
  return { auto: ["Yes", "No"], tf: ["True", "False"], yn: ["Y", "N"], check: ["✓", ""] }[displayOf(c)];
}

/** Date columns: { date: a DATE_FORMATS key or "MMM YYYY", or null; time: show HH:mm; seconds: HH:mm:ss }. */
export function dateSpec(c, tpl) {
  const d = displayOf(c);
  if (c.type === "Date") return { date: d === "auto" ? tpl.dateFormat : d, time: false, seconds: false };
  return { date: d === "time" || d === "timesec" ? null : tpl.dateFormat, time: d !== "date", seconds: d === "seconds" || d === "timesec" };
}
