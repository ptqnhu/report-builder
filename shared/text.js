export const pad = (n) => String(n).padStart(2, "0");
export const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");

/** Splits snake_case, camelCase and spaced names into lowercase words. */
export function tokens(name) {
  return String(name)
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** "order_id" -> "Order ID" */
export function prettify(name) {
  const t = tokens(name).map((w) => (w === "id" ? "ID" : w));
  if (!t.length) return String(name);
  const s = t.join(" ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Columns like order_id or year shouldn't get thousands separators or totals. */
export function idLike(name) {
  const t = tokens(name);
  return ["id", "year", "no", "zip", "code"].includes(t[t.length - 1]);
}

export function fileSlug(title) {
  return (title || "report").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").toLowerCase() || "report";
}
