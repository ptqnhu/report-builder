import { pad } from "./text.js";

export const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Parses YYYY-MM-DD as a local date (not UTC), anything else via Date. */
export function parseLocalDate(s) {
  if (!s) return null;
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

export function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function fmtDate(d, f) {
  const y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
  switch (f) {
    case "YYYY-MM-DD": return `${y}-${pad(m)}-${pad(day)}`;
    case "MM/DD/YYYY": return `${pad(m)}/${pad(day)}/${y}`;
    case "DD/MM/YYYY": return `${pad(day)}/${pad(m)}/${y}`;
    default: return `${day} ${MON[m - 1]} ${y}`;
  }
}
