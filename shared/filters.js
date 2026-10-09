import { OPS, NO_VALUE_OPS, family } from "./constants.js";
import { parseLocalDate, startOfDay, fmtDate } from "./dates.js";

/** A filter is applied only once it has a valid operator and its values. */
export function filterActive(f, col) {
  if (!col) return false;
  const ops = OPS[family(col.type)].map((o) => o[0]);
  if (!ops.includes(f.op)) return false;
  if (NO_VALUE_OPS.has(f.op)) return true;
  if (f.op === "between") return f.value !== "" && f.value2 !== "";
  return f.value !== "";
}

export function testFilter(v, f, col) {
  const type = col.type;
  if (f.op === "empty") return v === null || v === "";
  if (f.op === "notempty") return !(v === null || v === "");
  if (f.op === "true") return v === true;
  if (f.op === "false") return v === false;
  if (v === null) return false;
  const fam = family(type);
  if (fam === "Number") {
    const scale = type === "Percentage" ? 100 : 1; // percentages are entered as 15, stored as 0.15
    const a = parseFloat(f.value) / scale, b = parseFloat(f.value2) / scale;
    const eps = 1e-9;
    switch (f.op) {
      case "eq": return Math.abs(v - a) < eps;
      case "neq": return Math.abs(v - a) >= eps;
      case "gt": return v > a;
      case "gte": return v >= a - eps;
      case "lt": return v < a;
      case "lte": return v <= a + eps;
      case "between": return v >= Math.min(a, b) - eps && v <= Math.max(a, b) + eps;
      default: return true;
    }
  }
  if (fam === "Date") {
    const a = parseLocalDate(f.value), b = parseLocalDate(f.value2);
    if (!a) return true;
    const day = startOfDay(v), at = a.getTime();
    switch (f.op) {
      case "on": return day === at;
      case "before": return day < at;
      case "after": return day > at;
      case "between": { if (!b) return true; const bt = b.getTime(); return day >= Math.min(at, bt) && day <= Math.max(at, bt); }
      default: return true;
    }
  }
  const s = String(v).toLowerCase(), q = String(f.value).toLowerCase();
  switch (f.op) {
    case "contains": return s.includes(q);
    case "notcontains": return !s.includes(q);
    case "equals": return s === q;
    case "starts": return s.startsWith(q);
    default: return true;
  }
}

export function applyFilters(rows, filters, colsByKey) {
  const active = filters.filter((f) => filterActive(f, colsByKey[f.col]));
  if (!active.length) return rows;
  return rows.filter((r) => active.every((f) => testFilter(r[f.col], f, colsByKey[f.col])));
}

export function describeFilter(f, col, tpl) {
  const opLabel = (OPS[family(col.type)].find((o) => o[0] === f.op) || [null, f.op])[1];
  if (NO_VALUE_OPS.has(f.op)) return `${col.label} ${opLabel}`;
  const show = (x) => {
    if (family(col.type) === "Date") { const d = parseLocalDate(x); return d ? fmtDate(d, tpl.dateFormat) : x; }
    if (col.type === "Percentage") return `${x}%`;
    if (col.type === "Currency") return `${tpl.currency}${x}`;
    if (family(col.type) === "Text") return `“${x}”`;
    return x;
  };
  if (f.op === "between") return `${col.label} ${opLabel} ${show(f.value)} and ${show(f.value2)}`;
  return `${col.label} ${opLabel} ${show(f.value)}`;
}
