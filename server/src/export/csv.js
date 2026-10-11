import { formatValue } from "@report-builder/shared";

/** Rows (objects keyed by column key, values already coerced) as CSV text, written the way the preview shows them. */
export function toCsv(cols, rows, tpl) {
  const esc = (s) => (/[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const lines = [cols.map((c) => esc(c.label)).join(",")];
  for (const r of rows) lines.push(cols.map((c) => esc(formatValue(r[c.key], c, tpl))).join(","));
  return "﻿" + lines.join("\r\n") + "\r\n"; // the BOM makes Excel read the file as UTF-8
}
