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

/** Column names as headings, every word capitalised: "order_id" -> "Order ID", "orderDate" -> "Order Date" */
export function prettify(name) {
  const t = tokens(name).map((w) => (w === "id" ? "ID" : w.charAt(0).toUpperCase() + w.slice(1)));
  return t.length ? t.join(" ") : String(name);
}

/** Columns like order_id or year shouldn't get thousands separators or totals. */
export function idLike(name) {
  const t = tokens(name);
  return ["id", "year", "no", "zip", "code"].includes(t[t.length - 1]);
}

export function fileSlug(title) {
  return (title || "report").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").toLowerCase() || "report";
}
