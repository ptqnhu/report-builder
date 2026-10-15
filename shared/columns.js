import { NUMERIC } from "./constants.js";
import { prettify } from "./text.js";

/**
 * Merges the selected query columns with the template's per-column settings.
 * Settings are keyed by column name, so a template works with any query:
 * known columns keep their settings, new ones get defaults.
 */
export function effectiveColumns(columns, tpl) {
  const sel = columns.filter((c) => c.selected);
  const byName = new Map(sel.map((c) => [c.name, c]));
  const ordered = [
    ...tpl.order.filter((n) => byName.has(n)).map((n) => byName.get(n)),
    ...sel.filter((c) => !tpl.order.includes(c.name)),
  ];
  // A column's own settings come first, then its data type's (tpl.types), then the defaults
  const set = (v) => (v && v !== "auto" ? v : null);
  return ordered.map((c) => {
    const s = tpl.cols[c.name] || {};
    const t = tpl.types?.[c.type] || {};
    return {
      ...c, label: s.label || prettify(c.name), align: set(s.align) || t.align || "auto", width: s.width || "auto", wrap: !!s.wrap,
      display: set(s.display) || t.display || "auto", color: t.color || null, bold: !!t.bold,
    };
  });
}

export function alignOf(c) {
  if (c.align && c.align !== "auto") return c.align;
  if (NUMERIC.has(c.type)) return "right";
  if (c.type === "Boolean") return "center";
  return "left";
}

export const keyBy = (cols) => Object.fromEntries(cols.map((c) => [c.key, c]));
